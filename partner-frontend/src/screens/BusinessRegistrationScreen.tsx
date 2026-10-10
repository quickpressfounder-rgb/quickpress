import { useNavigate } from "@tanstack/react-router";
import {
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  Bath,
  Blinds,
  Building2,
  Calendar,
  Camera,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  CreditCard,
  Edit3,
  ExternalLink,
  Eye,
  FileCheck2,
  FileText,
  Footprints,
  Globe,
  Hash,
  HelpCircle,
  IdCard,
  Image as ImageIcon,
  Info,
  Landmark,
  Layers,
  Loader2,
  Lock,
  Mail,
  MapPin,
  Navigation,
  PenTool,
  Percent,
  Phone,
  ReceiptText,
  RefreshCw,
  RotateCcw,
  Search,
  Send,
  ShieldAlert,
  ShieldCheck,
  Shirt,
  Sparkles,
  Store,
  Trash2,
  Upload,
  User,
  UserCheck,
  UserRound,
  Wind,
  Zap,
} from "lucide-react";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { Toaster } from "@/shared/ui/sonner";
import { PartnerAuthHeader } from "../components/PartnerAuthHeader";
import { MapPicker, type PickedLocation } from "../components/MapPicker";
import {
  PartnerAgreementSignaturePad,
  type AgreementSignatureData,
} from "../components/onboarding/PartnerAgreementSignaturePad";
import { SimpleSelfieCaptureModal } from "../components/kyc/SimpleSelfieCaptureModal";
import { compareKycNames } from "../lib/kyc-name-matcher";
import { playPartnerOrderChime } from "../lib/partner-order-alert-sound";
import { usePartnerContext } from "../context/PartnerContext";
import { useLanguage } from "../lib/i18n";
import { partnerRoutes } from "../navigation/partner-routes";
import {
  checkPartnerVerificationStatus,
  registerBusiness,
  uploadPartnerDocument,
  verifyPartnerGst,
  verifyPartnerIfsc,
} from "@/api/partner/partner-auth-api";
import {
  fetchMasterCatalogServices,
  type MasterCatalogItem,
} from "@/api/partner/partner-services-api";
import {
  checkPincodeServiceability,
  fetchAllowedCities,
  type PincodeServiceabilityResult,
} from "@/api/core/maps-api";
import type { BusinessCategory, BusinessRegistrationPayload } from "@/shared/types/partner";

/* ----------------------------- static constants ----------------------------- */

const STEPS = [
  { num: 1, title: "Personal Details", short: "Personal", icon: UserRound },
  { num: 2, title: "Aadhaar, PAN & Photo", short: "KYC & Photo", icon: IdCard },
  { num: 3, title: "Business Details", short: "Business", icon: Store },
  { num: 4, title: "Services Specific", short: "Services", icon: Sparkles },
  { num: 5, title: "Bank Details", short: "Bank", icon: Landmark },
  { num: 6, title: "Agreement & Review", short: "Agreement", icon: FileCheck2 },
] as const;

const BUSINESS_TYPES = [
  { id: "Laundry", label: "🧺 Laundry (Wash & Fold/Iron)", category: "laundry" as BusinessCategory },
  { id: "Dry Cleaning", label: "👔 Dry Cleaning Specialist", category: "dry-clean" as BusinessCategory },
  { id: "Steam Iron", label: "⚡ Steam Pressing Hub", category: "laundry" as BusinessCategory },
  { id: "Shoe Care", label: "👟 Footwear & Bag Spa", category: "shoe-care" as BusinessCategory },
  { id: "Premium Multi-Service", label: "✨ Premium Multi-Service Studio", category: "premium" as BusinessCategory },
] as const;

const EXPERIENCE_OPTIONS = [
  "Less than 1 year",
  "1 - 3 years",
  "3 - 5 years",
  "5 - 10 years",
  "More than 10 years",
] as const;

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

const DEFAULT_SERVICES: (MasterCatalogItem & { category?: string })[] = [
  { id: "Shirt Steam Iron", name: "Shirt Steam Iron", price: 15, unit: "pc", defaultHours: 12, category: "iron", desc: "Crisp wrinkle-free hanger finish for formal and casual shirts." },
  { id: "T-Shirt Steam Iron", name: "T-Shirt Steam Iron", price: 12, unit: "pc", defaultHours: 12, category: "iron", desc: "Gentle temperature-controlled steam press for cotton and polo tees." },
  { id: "Trouser / Jeans Steam Iron", name: "Trouser / Jeans Steam Iron", price: 15, unit: "pc", defaultHours: 12, category: "iron", desc: "Sharp razor creases and flat line press for pants and denim." },
  { id: "Kurta / Pyjama Steam Iron", name: "Kurta / Pyjama Steam Iron", price: 25, unit: "pc", defaultHours: 12, category: "iron", desc: "Traditional ethnic wear wrinkle-free steam pressing." },
  { id: "Saree Steam Press", name: "Saree Steam Press", price: 59, unit: "pc", defaultHours: 12, category: "iron", desc: "Delicate temperature steam finish with roller packaging." },
  { id: "Blazer / Coat Steam Iron", name: "Blazer / Coat Steam Iron", price: 69, unit: "pc", defaultHours: 12, category: "iron", desc: "Form-retaining 3D vertical steam pressing for coats." },
  { id: "Shirt Dry Clean", name: "Shirt Dry Clean", price: 79, unit: "pc", defaultHours: 36, category: "dry-clean", desc: "Eco-friendly solvent stain removal and crisp collar finish." },
  { id: "Trouser / Jeans Dry Clean", name: "Trouser / Jeans Dry Clean", price: 79, unit: "pc", defaultHours: 36, category: "dry-clean", desc: "Deep solvent cleaning, spot treatment and sharp creasing." },
  { id: "2-Piece Suit Dry Clean", name: "2-Piece Suit Dry Clean", price: 249, unit: "set", defaultHours: 48, category: "dry-clean", desc: "Blazer + Trouser tailored luxury solvent care and hanger pack." },
  { id: "3-Piece Suit Dry Clean", name: "3-Piece Suit Dry Clean", price: 349, unit: "set", defaultHours: 48, category: "dry-clean", desc: "Jacket + Waistcoat + Trouser complete executive dry clean." },
  { id: "Winter Jacket / Bomber Dry Clean", name: "Winter Jacket / Bomber Dry Clean", price: 199, unit: "pc", defaultHours: 48, category: "dry-clean", desc: "Padded and down jacket deep soil and grime extraction." },
  { id: "Wash & Fold (Per Kg)", name: "Wash & Fold (Per Kg)", price: 79, unit: "kg", defaultHours: 24, category: "wash", desc: "Daily wear clothes washed, dried & neatly folded." },
  { id: "Wash & Steam Iron (Per Kg)", name: "Wash & Steam Iron (Per Kg)", price: 99, unit: "kg", defaultHours: 24, category: "wash", desc: "Wash with fabric conditioner & professional steam ironing." },
  { id: "Silk Saree Dry Clean & Roll Polish", name: "Silk Saree Dry Clean & Roll Polish", price: 249, unit: "pc", defaultHours: 48, category: "premium", desc: "Delicate pure silk wash, stain removal and roll polish finish." },
  { id: "Heavy Zari / Bridal Lehenga Spa", name: "Heavy Zari / Bridal Lehenga Spa", price: 499, unit: "pc", defaultHours: 72, category: "premium", desc: "Delicate stone and zari embroidery protection with hand finishing." },
  { id: "Sneakers & Sports Shoes Deep Clean", name: "Sneakers & Sports Shoes Deep Clean", price: 249, unit: "pair", defaultHours: 48, category: "shoe-care", desc: "Deep sonic foam scrubbing, deodorizing and sole whitening." },
  { id: "Leather Shoes Cleaning & Polish", name: "Leather Shoes Cleaning & Polish", price: 299, unit: "pair", defaultHours: 48, category: "shoe-care", desc: "Wax buffing, leather cream nourishment and mirror shine." },
  { id: "Single Blanket / Quilt Wash", name: "Single Blanket / Quilt Wash", price: 249, unit: "pc", defaultHours: 48, category: "home-care", desc: "Winter comforter sanitized, washed & sun fluff-dried." },
  { id: "Double Blanket / Heavy Rajai Wash", name: "Double Blanket / Heavy Rajai Wash", price: 349, unit: "pc", defaultHours: 48, category: "home-care", desc: "Heavy double winter quilt deep allergen extraction." },
  { id: "Curtain Cleaning (Per Panel)", name: "Curtain Cleaning (Per Panel)", price: 199, unit: "panel", defaultHours: 36, category: "home-care", desc: "Dust-free steam extraction and anti-shrink washing." },
];

const SERVICE_CATEGORY_TABS = [
  { id: "all", label: "All Items" },
  { id: "iron", label: "⚡ Steam Iron" },
  { id: "dry-clean", label: "👔 Dry Clean" },
  { id: "wash", label: "🧺 Wash & Fold" },
  { id: "premium", label: "✨ Saree & Silk" },
  { id: "shoe-care", label: "👟 Shoes & Care" },
  { id: "home-care", label: "🪟 Blankets & Home" },
] as const;

const DAYS = [
  "None (Open 7 Days)",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
] as const;

const DRAFT_STORAGE_KEY = "quickpress_partner_registration_draft_v2";

/** Haptic feedback helper */
function triggerHaptic() {
  try {
    if (typeof navigator !== "undefined" && navigator.vibrate) {
      navigator.vibrate([15, 30, 15]);
    }
  } catch {}
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

/** Reusable Document Upload Slot Component */
interface DocumentUploadSlotProps {
  label: string;
  sublabel?: string;
  docType: string;
  value: string;
  onChange: (url: string) => void;
  isUploading: boolean;
  setIsUploading: (loading: boolean) => void;
  accept?: string;
  partnerId?: string;
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
  partnerId,
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
        const res = await uploadPartnerDocument(compressedDataUrl, docType, partnerId);
        if (res && res.url) {
          onChange(res.url);
          toast.success(`${label} uploaded securely`);
        }
      } catch {
        toast.success(`${label} attached`);
      }
    } catch (err: any) {
      toast.error(`Could not process image: ${err?.message || "Error"}`);
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
        className="hidden"
        onChange={handleFileSelected}
      />

      {value ? (
        <div className="relative flex items-center gap-3 p-2.5 bg-neutral-50 border border-neutral-200 rounded-xl overflow-hidden shadow-2xs">
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
            className="px-2.5 py-1.5 bg-white hover:bg-neutral-100 border border-neutral-200 text-neutral-700 text-xs font-bold rounded-lg active:scale-95 transition-all shrink-0 shadow-2xs"
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
              : "border-dashed bg-neutral-50/70 border-neutral-300 hover:border-emerald-500 hover:bg-emerald-50/20"
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
          <span
            className={`text-xs font-bold px-2.5 py-1 rounded-md shrink-0 border ${
              error ? "text-red-700 bg-red-100/50 border-red-300" : "text-neutral-700 bg-white border-neutral-200 shadow-2xs"
            }`}
          >
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
          <h4 className="text-xs font-bold text-red-950">
            Please fill the remaining details ({missingList.length} items):
          </h4>
          <ul className="mt-1.5 space-y-1">
            {missingList.map((item, idx) => (
              <li key={idx} className="text-[11px] font-medium text-red-800 flex items-center gap-1.5">
                <span className="size-1.5 rounded-full bg-red-500 shrink-0" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

/* ----------------------------- Main Component ----------------------------- */

export function BusinessRegistrationScreen() {
  const navigate = useNavigate();
  const { session, signIn, hydrating, phone } = usePartnerContext();
  const { openLanguageModal, language, t } = useLanguage();

  const [currentStep, setCurrentStep] = useState<number>(1);
  const [busy, setBusy] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [missingSummary, setMissingSummary] = useState<string[]>([]);

  // Re-submission / Correction States
  const [isResubmissionFlow, setIsResubmissionFlow] = useState(false);
  const [rejectionNotice, setRejectionNotice] = useState<string | null>(null);

  // STEP 1: Personal Details
  const [ownerName, setOwnerName] = useState("");
  const [mobile, setMobile] = useState(phone || "");
  const [email, setEmail] = useState("");
  const [gender, setGender] = useState<"Male" | "Female" | "Other">("Male");
  const [dob, setDob] = useState("");
  const [alternatePhone, setAlternatePhone] = useState("");

  // STEP 2: KYC & Photo
  const [aadhaarNumber, setAadhaarNumber] = useState("");
  const [aadhaarFrontUrl, setAadhaarFrontUrl] = useState("");
  const [aadhaarBackUrl, setAadhaarBackUrl] = useState("");
  const [isUploadingAadhaarFront, setIsUploadingAadhaarFront] = useState(false);
  const [isUploadingAadhaarBack, setIsUploadingAadhaarBack] = useState(false);

  // PAN
  const [panNumber, setPanNumber] = useState("");
  const [panCardUrl, setPanCardUrl] = useState("");
  const [isUploadingPanCard, setIsUploadingPanCard] = useState(false);

  // Owner Live Photo / Selfie
  const [ownerPhotoUrl, setOwnerPhotoUrl] = useState("");
  const [isCameraModalOpen, setIsCameraModalOpen] = useState(false);
  const [isUploadingOwnerPhoto, setIsUploadingOwnerPhoto] = useState(false);

  // STEP 3: Business Details
  const [shopName, setShopName] = useState("");
  const [businessType, setBusinessType] = useState<string>("Laundry");
  const [experience, setExperience] = useState<string>("1 - 3 years");
  const [gstin, setGstin] = useState("");
  const [verifyingGst, setVerifyingGst] = useState(false);
  const [gstVerified, setGstVerified] = useState(false);
  const [shopAddress, setShopAddress] = useState("");
  const [city, setCity] = useState("Kasganj");
  const [area, setArea] = useState("");
  const [pincode, setPincode] = useState("207123");
  const [pincodeLoading, setPincodeLoading] = useState(false);
  const [pincodeServiceability, setPincodeServiceability] = useState<PincodeServiceabilityResult | null>(null);
  const [pickedLatitude, setPickedLatitude] = useState<number>(27.8083);
  const [pickedLongitude, setPickedLongitude] = useState<number>(78.6474);
  const [showMapPicker, setShowMapPicker] = useState(false);
  const [openingTime, setOpeningTime] = useState("08:00");
  const [closingTime, setClosingTime] = useState("21:00");
  const [weeklyOff, setWeeklyOff] = useState("None (Open 7 Days)");
  const [logoUrl, setLogoUrl] = useState("");
  const [bannerUrl, setBannerUrl] = useState("");
  const [galleryUrls, setGalleryUrls] = useState<string[]>([]);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [isUploadingBanner, setIsUploadingBanner] = useState(false);
  const [isUploadingGallery, setIsUploadingGallery] = useState(false);

  // STEP 4: Services Specific
  const [catalogServices, setCatalogServices] = useState<(MasterCatalogItem & { category?: string })[]>(DEFAULT_SERVICES);
  const [serviceCategoryTab, setServiceCategoryTab] = useState<string>("all");
  const [serviceSearchQuery, setServiceSearchQuery] = useState<string>("");
  const [selectedServices, setSelectedServices] = useState<string[]>([
    "Shirt Steam Iron",
    "T-Shirt Steam Iron",
    "Trouser / Jeans Steam Iron",
    "Shirt Dry Clean",
    "Trouser / Jeans Dry Clean",
    "Wash & Fold (Per Kg)",
    "Wash & Steam Iron (Per Kg)",
  ]);
  const [servicePrices, setServicePrices] = useState<Record<string, number>>({
    "Wash & Fold (Per Kg)": 79,
    "Wash & Steam Iron (Per Kg)": 99,
    "Shirt Steam Iron": 15,
    "T-Shirt Steam Iron": 12,
    "Trouser / Jeans Steam Iron": 15,
    "Shirt Dry Clean": 79,
    "Trouser / Jeans Dry Clean": 79,
    "2-Piece Suit Dry Clean": 249,
    "Silk Saree Dry Clean & Roll Polish": 249,
    "Sneakers & Sports Shoes Deep Clean": 249,
    "Single Blanket / Quilt Wash": 249,
  });
  const [serviceTurnarounds, setServiceTurnarounds] = useState<Record<string, number>>({
    "Wash & Fold (Per Kg)": 24,
    "Wash & Steam Iron (Per Kg)": 24,
    "Shirt Steam Iron": 12,
    "T-Shirt Steam Iron": 12,
    "Trouser / Jeans Steam Iron": 12,
    "Shirt Dry Clean": 36,
    "Trouser / Jeans Dry Clean": 36,
    "2-Piece Suit Dry Clean": 48,
    "Silk Saree Dry Clean & Roll Polish": 48,
    "Sneakers & Sports Shoes Deep Clean": 48,
    "Single Blanket / Quilt Wash": 48,
  });
  const [pickupRadius, setPickupRadius] = useState<number>(8);
  const [deliveryRadius, setDeliveryRadius] = useState<number>(10);

  // STEP 5: Bank Details
  const [bankName, setBankName] = useState("State Bank of India (SBI)");
  const [customBankName, setCustomBankName] = useState("");
  const [accountHolder, setAccountHolder] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [confirmAccountNumber, setConfirmAccountNumber] = useState("");
  const [ifsc, setIfsc] = useState("");
  const [verifyingIfsc, setVerifyingIfsc] = useState(false);
  const [ifscDetails, setIfscDetails] = useState<{ bank: string; branch: string; city: string } | null>(null);
  const [chequePhotoUrl, setChequePhotoUrlUrl] = useState("");
  const [isUploadingCheque, setIsUploadingCheque] = useState(false);

  // STEP 6: Agreement & E-Signature
  const [agreementSignature, setAgreementSignature] = useState<AgreementSignatureData | null>(null);
  const [consentAadhaarEsign, setConsentAadhaarEsign] = useState(false);
  const [consentTermsAccepted, setConsentTermsAccepted] = useState(false);

  // Approved cities from server
  const [approvedCities, setApprovedCities] = useState<string[]>(["Kasganj", "Aligarh", "Mathura", "Hathras"]);

  // Browser / Hardware Popstate Back Button Handling (matching Rider flow)
  useEffect(() => {
    window.history.replaceState({ page: "partner-registration", step: currentStep }, "");

    const handlePopState = () => {
      if (currentStep > 1) {
        setCurrentStep((prev) => prev - 1);
        window.history.pushState({ page: "partner-registration", step: currentStep - 1 }, "");
      }
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [currentStep]);

  // Route protection
  useEffect(() => {
    if (hydrating) return;
    if (!session) {
      navigate({ to: partnerRoutes.auth });
      return;
    }
    const urlParams = new URLSearchParams(window.location.search);
    const isResubmitParam = urlParams.get("resubmit") === "true" || urlParams.get("edit") === "true";
    if (session.isOnboarded && !session.isVerified && !isResubmitParam && session.status !== "rejected" && (session as any).kycStatus !== "rejected") {
      navigate({ to: partnerRoutes.registrationSubmitted });
      return;
    }
    if (session.isOnboarded && session.isVerified) {
      navigate({ to: partnerRoutes.dashboard });
      return;
    }
  }, [hydrating, session, navigate]);

  // Load Approved Cities & Master Catalog
  useEffect(() => {
    let alive = true;
    fetchAllowedCities().then((cities) => {
      if (!alive || !Array.isArray(cities)) return;
      const names = cities.map((c) => c.name || c.city || c.id).filter(Boolean);
      if (names.length > 0) setApprovedCities(names);
    }).catch(() => {});

    fetchMasterCatalogServices().then((items) => {
      if (!alive || !Array.isArray(items) || items.length === 0) return;
      setCatalogServices(items);
      setServicePrices((prev) => {
        const next = { ...prev };
        for (const it of items) {
          if (next[it.id] === undefined) next[it.id] = it.price;
        }
        return next;
      });
      setServiceTurnarounds((prev) => {
        const next = { ...prev };
        for (const it of items) {
          if (next[it.id] === undefined) next[it.id] = it.defaultHours;
        }
        return next;
      });
    }).catch(() => {});

    return () => {
      alive = false;
    };
  }, []);

  // Pre-fill from Session and Verification Status (Re-submission / Draft data)
  useEffect(() => {
    let active = true;
    const urlParams = new URLSearchParams(window.location.search);
    const isResubmitParam = urlParams.get("resubmit") === "true" || urlParams.get("edit") === "true";

    // 1. First check LocalStorage draft
    try {
      const savedDraft = localStorage.getItem(DRAFT_STORAGE_KEY);
      if (savedDraft) {
        const d = JSON.parse(savedDraft);
        if (d.ownerName) setOwnerName(d.ownerName);
        if (d.mobile) setMobile(d.mobile);
        if (d.email) setEmail(d.email);
        if (d.gender) setGender(d.gender);
        if (d.dob) setDob(d.dob);
        if (d.alternatePhone) setAlternatePhone(d.alternatePhone);
        if (d.aadhaarNumber) setAadhaarNumber(d.aadhaarNumber);
        if (d.aadhaarFrontUrl) setAadhaarFrontUrl(d.aadhaarFrontUrl);
        if (d.aadhaarBackUrl) setAadhaarBackUrl(d.aadhaarBackUrl);
        if (d.panNumber) setPanNumber(d.panNumber);
        if (d.panCardUrl) setPanCardUrl(d.panCardUrl);
        if (d.ownerPhotoUrl) setOwnerPhotoUrl(d.ownerPhotoUrl);
        if (d.shopName) setShopName(d.shopName);
        if (d.businessType) setBusinessType(d.businessType);
        if (d.experience) setExperience(d.experience);
        if (d.gstin) setGstin(d.gstin);
        if (d.shopAddress) setShopAddress(d.shopAddress);
        if (d.city) setCity(d.city);
        if (d.area) setArea(d.area);
        if (d.pincode) setPincode(d.pincode);
        if (d.logoUrl) setLogoUrl(d.logoUrl);
        if (d.bannerUrl) setBannerUrl(d.bannerUrl);
        if (Array.isArray(d.galleryUrls)) setGalleryUrls(d.galleryUrls);
        if (Array.isArray(d.selectedServices)) setSelectedServices(d.selectedServices);
        if (d.servicePrices) setServicePrices(d.servicePrices);
        if (d.serviceTurnarounds) setServiceTurnarounds(d.serviceTurnarounds);
        if (d.bankName) setBankName(d.bankName);
        if (d.accountHolder) setAccountHolder(d.accountHolder);
        if (d.accountNumber) {
          setAccountNumber(d.accountNumber);
          setConfirmAccountNumber(d.accountNumber);
        }
        if (d.ifsc) setIfsc(d.ifsc);
        if (d.chequePhotoUrl) setChequePhotoUrlUrl(d.chequePhotoUrl);
      }
    } catch {}

    // 2. Fetch server status and draft data
    checkPartnerVerificationStatus()
      .then((statusRes) => {
        if (!active || !statusRes) return;
        if (statusRes.isVerified) {
          toast.success("Account already approved. Opening Dashboard...");
          navigate({ to: partnerRoutes.dashboard, replace: true });
          return;
        }
        if (statusRes.isOnboarded && !isResubmitParam && statusRes.status !== "rejected" && statusRes.kycStatus !== "rejected") {
          navigate({ to: partnerRoutes.registrationSubmitted, replace: true });
          return;
        }

        if (isResubmitParam || statusRes.status === "rejected" || statusRes.kycStatus === "rejected") {
          setIsResubmissionFlow(true);
        }
        if (statusRes.rejectionReason) {
          setRejectionNotice(statusRes.rejectionReason);
        }

        if (statusRes.draftData) {
          const d = statusRes.draftData;
          if (d.ownerName) setOwnerName(d.ownerName);
          if (d.phone || d.mobile) setMobile(d.phone || d.mobile);
          if (d.email) setEmail(d.email);
          if (d.gender) setGender(d.gender);
          if (d.dob) setDob(d.dob);
          if (d.alternatePhone) setAlternatePhone(d.alternatePhone);
          if (d.aadhaar) setAadhaarNumber(d.aadhaar);
          if (d.aadhaarFront) setAadhaarFrontUrl(d.aadhaarFront);
          if (d.aadhaarBack) setAadhaarBackUrl(d.aadhaarBack);
          if (d.pan) setPanNumber(d.pan);
          if (d.panCard) setPanCardUrl(d.panCard);
          if (d.ownerPhoto || d.photo) setOwnerPhotoUrl(d.ownerPhoto || d.photo);
          if (d.shopName || d.businessName) setShopName(d.shopName || d.businessName);
          if (d.businessType || d.category) setBusinessType(d.businessType || d.category);
          if (d.experience) setExperience(d.experience);
          if (d.gstin) setGstin(d.gstin);
          if (d.shopAddress || d.address) setShopAddress(d.shopAddress || d.address);
          if (d.city) setCity(d.city);
          if (d.area) setArea(d.area);
          if (d.pincode) setPincode(d.pincode);
          if (d.logo) setLogoUrl(d.logo);
          if (d.banner) setBannerUrl(d.banner);
          if (Array.isArray(d.gallery)) setGalleryUrls(d.gallery);
          if (Array.isArray(d.services) && d.services.length > 0) setSelectedServices(d.services);
          if (d.bankName) setBankName(d.bankName);
          if (d.accountHolder) setAccountHolder(d.accountHolder);
          if (d.accountNumber) {
            setAccountNumber(d.accountNumber);
            setConfirmAccountNumber(d.accountNumber);
          }
          if (d.ifsc) setIfsc(d.ifsc);
          if (d.chequePhoto) setChequePhotoUrlUrl(d.chequePhoto);
        }
      })
      .catch(() => {});

    return () => {
      active = false;
    };
  }, [navigate]);

  // Pre-fill phone and owner name safely from session
  useEffect(() => {
    if (session) {
      if (!mobile && (phone || session.phone)) {
        setMobile(phone || session.phone || "");
      }
      if (!email && session.email) {
        setEmail(session.email);
      }
      if (!ownerName && session.ownerName && !/^\+?[\d\s\-()]+$/.test(session.ownerName.trim())) {
        setOwnerName(session.ownerName);
      }
    }
  }, [session, phone]);

  // Real-time Pincode Serviceability Check
  useEffect(() => {
    const cleanPin = pincode.trim().replace(/\D/g, "");
    if (cleanPin.length === 6) {
      setPincodeLoading(true);
      checkPincodeServiceability(cleanPin)
        .then((res) => {
          setPincodeServiceability(res);
          if (res.isServiceable && res.city) {
            const match = approvedCities.find((c) => c.toLowerCase() === res.city?.toLowerCase());
            if (match) setCity(match);
          }
        })
        .finally(() => setPincodeLoading(false));
    } else {
      setPincodeServiceability(null);
    }
  }, [pincode, approvedCities]);

  // Auto-Save Draft to LocalStorage
  useEffect(() => {
    const draftPayload = {
      ownerName,
      mobile,
      email,
      gender,
      dob,
      alternatePhone,
      aadhaarNumber,
      aadhaarFrontUrl,
      aadhaarBackUrl,
      panNumber,
      panCardUrl,
      ownerPhotoUrl,
      shopName,
      businessType,
      experience,
      gstin,
      shopAddress,
      city,
      area,
      pincode,
      logoUrl,
      bannerUrl,
      galleryUrls,
      selectedServices,
      servicePrices,
      serviceTurnarounds,
      bankName,
      accountHolder,
      accountNumber,
      ifsc,
      chequePhotoUrl,
    };
    try {
      localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draftPayload));
    } catch {}
  }, [
    ownerName,
    mobile,
    email,
    gender,
    dob,
    alternatePhone,
    aadhaarNumber,
    aadhaarFrontUrl,
    aadhaarBackUrl,
    panNumber,
    panCardUrl,
    ownerPhotoUrl,
    shopName,
    businessType,
    experience,
    gstin,
    shopAddress,
    city,
    area,
    pincode,
    logoUrl,
    bannerUrl,
    galleryUrls,
    selectedServices,
    servicePrices,
    serviceTurnarounds,
    bankName,
    accountHolder,
    accountNumber,
    ifsc,
    chequePhotoUrl,
  ]);

  // Synchronize accountHolder with ownerName (same name as Step 1)
  useEffect(() => {
    if (ownerName.trim()) {
      setAccountHolder(ownerName.trim());
    }
  }, [ownerName]);

  /* ------------------- KYC Verification Handlers ------------------- */

  // Verification Handlers

  // 3. GSTIN Verification
  const handleVerifyGst = async () => {
    const clean = gstin.trim().toUpperCase();
    if (clean.length !== 15) {
      toast.error("Please enter a valid 15-character GSTIN");
      return;
    }
    setVerifyingGst(true);
    try {
      const res = await verifyPartnerGst(clean, shopName, ownerName);
      if (res.valid) {
        setGstVerified(true);
        if (res.tradeName && !shopName) setShopName(res.tradeName);
        toast.success(`GSTIN verified: ${res.tradeName || "Active Taxpayer"} ✓`);
      } else {
        toast.error("GSTIN verification failed");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to verify GSTIN");
    } finally {
      setVerifyingGst(false);
    }
  };

  // 4. IFSC Verification (Live RBI registry)
  const autoVerifyIfscCode = async (rawCode?: string) => {
    const clean = (rawCode || ifsc).trim().toUpperCase();
    if (clean.length !== 11) return;
    setVerifyingIfsc(true);
    try {
      const res = await verifyPartnerIfsc(clean);
      if (res.valid && res.bankName) {
        setIfscDetails({
          bank: res.bankName,
          branch: res.branch || "Branch",
          city: res.city || city,
          state: res.state || "",
        });
        const match = INDIAN_BANKS.find((b) => b.toLowerCase().includes(res.bankName.toLowerCase()));
        if (match) setBankName(match);
        else {
          setBankName("Other Bank");
          setCustomBankName(res.bankName);
        }
        setFieldErrors((prev) => {
          const next = { ...prev };
          delete next["ifsc"];
          delete next["bankName"];
          return next;
        });
        toast.success(`RBI Verified: ${res.bankName} (${res.branch}) ✓`);
      } else {
        setIfscDetails(null);
        setFieldErrors((prev) => ({ ...prev, ifsc: "Invalid IFSC code according to RBI registry" }));
      }
    } catch (err: any) {
      setIfscDetails(null);
      setFieldErrors((prev) => ({ ...prev, ifsc: err.message || "Could not verify IFSC with RBI" }));
    } finally {
      setVerifyingIfsc(false);
    }
  };

  const handleVerifyIfsc = async () => {
    await autoVerifyIfscCode();
  };



  /* ------------------- Step Navigation & Validation ------------------- */

  const handleNextStep = () => {
    setFieldErrors({});
    setMissingSummary([]);

    if (currentStep === 1) {
      // Step 1: Personal Details
      const errors: Record<string, string> = {};
      const missing: string[] = [];

      if (!ownerName.trim() || ownerName.trim().length < 2) {
        errors["ownerName"] = "Please enter owner full name as per official ID";
        missing.push("Owner Full Name (Owner Name)");
      }
      const cleanPhone = mobile.replace(/\D/g, "");
      if (cleanPhone.length < 10) {
        errors["mobile"] = "Please enter a valid 10-digit mobile number";
        missing.push("10-Digit Mobile Number");
      }
      if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
        errors["email"] = "Please enter a valid email address for statements";
        missing.push("Valid Email Address");
      }

      if (missing.length > 0) {
        setFieldErrors(errors);
        setMissingSummary(missing);
        toast.error(`Please complete ${missing.length} missing fields`);
        triggerHaptic();
        setTimeout(() => {
          document.getElementById("missing-fields-banner")?.scrollIntoView({ behavior: "smooth", block: "start" });
        }, 50);
        return;
      }

      setCurrentStep(2);
      triggerHaptic();
      toast.success("Personal details saved. Moving to Step 2 (Aadhaar, PAN & Photo)");
    } else if (currentStep === 2) {
      // Step 2: Aadhaar, PAN & Photo
      const errors: Record<string, string> = {};
      const missing: string[] = [];

      const cleanAadhaar = aadhaarNumber.replace(/\D/g, "");
      if (cleanAadhaar.length !== 12) {
        errors["aadhaarNumber"] = "Please enter a valid 12-digit Aadhaar number";
        missing.push("12-Digit Aadhaar Card Number");
      }
      if (!aadhaarFrontUrl) {
        errors["aadhaarFrontUrl"] = "Please upload Aadhaar Card Front photo";
        missing.push("Aadhaar Card Front Photo");
      }
      if (!aadhaarBackUrl) {
        errors["aadhaarBackUrl"] = "Please upload Aadhaar Card Back photo";
        missing.push("Aadhaar Card Back Photo");
      }

      const cleanPan = panNumber.trim().toUpperCase();
      if (!/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(cleanPan)) {
        errors["panNumber"] = "Please enter a valid 10-character PAN number";
        missing.push("Valid 10-Character PAN Number");
      }
      if (!panCardUrl) {
        errors["panCardUrl"] = "Please upload PAN Card photo";
        missing.push("PAN Card Photo");
      }

      if (!ownerPhotoUrl) {
        errors["ownerPhotoUrl"] = "Please take a live selfie or upload owner photo";
        missing.push("Owner Live Photo / Selfie");
      }

      if (missing.length > 0) {
        setFieldErrors(errors);
        setMissingSummary(missing);
        toast.error(`Please complete ${missing.length} required KYC documents`);
        triggerHaptic();
        setTimeout(() => {
          document.getElementById("missing-fields-banner")?.scrollIntoView({ behavior: "smooth", block: "start" });
        }, 50);
        return;
      }

      setCurrentStep(3);
      triggerHaptic();
      toast.success("KYC documents confirmed. Moving to Step 3 (Business Details)");
    } else if (currentStep === 3) {
      // Step 3: Business Details
      const errors: Record<string, string> = {};
      const missing: string[] = [];

      if (!shopName.trim() || shopName.trim().length < 2) {
        errors["shopName"] = "Please enter store / business name";
        missing.push("Store / Business Name");
      }
      if (!shopAddress.trim() || shopAddress.trim().length < 5) {
        errors["shopAddress"] = "Please enter complete shop address with street and landmark";
        missing.push("Complete Shop Address");
      }
      if (!city.trim()) {
        errors["city"] = "Please select your operating city";
        missing.push("Operating City");
      }
      const cleanPin = pincode.replace(/\D/g, "");
      if (cleanPin.length !== 6) {
        errors["pincode"] = "Please enter a 6-digit Pincode";
        missing.push("6-Digit Store Pincode");
      }
      if (!logoUrl) {
        errors["logoUrl"] = "Please upload Storefront Logo or Signboard Photo";
        missing.push("Store Logo / Signboard Photo");
      }
      if (!bannerUrl) {
        errors["bannerUrl"] = "Please upload Storefront Facade Banner Photo";
        missing.push("Storefront Facade Banner Photo");
      }

      if (missing.length > 0) {
        setFieldErrors(errors);
        setMissingSummary(missing);
        toast.error(`Please complete ${missing.length} store profile details`);
        triggerHaptic();
        setTimeout(() => {
          document.getElementById("missing-fields-banner")?.scrollIntoView({ behavior: "smooth", block: "start" });
        }, 50);
        return;
      }

      setCurrentStep(4);
      triggerHaptic();
      toast.success("Business details saved. Moving to Step 4 (Services & Pricing)");
    } else if (currentStep === 4) {
      // Step 4: Services Specific
      const errors: Record<string, string> = {};
      const missing: string[] = [];

      if (selectedServices.length === 0) {
        errors["selectedServices"] = "Please select at least 1 service offered by your store";
        missing.push("Select At Least 1 Service");
      }

      if (missing.length > 0) {
        setFieldErrors(errors);
        setMissingSummary(missing);
        toast.error(`Please select your store services`);
        triggerHaptic();
        return;
      }

      setCurrentStep(5);
      triggerHaptic();
      toast.success("Services configured. Moving to Step 5 (Bank Account)");
    } else if (currentStep === 5) {
      // Step 5: Bank Details
      const errors: Record<string, string> = {};
      const missing: string[] = [];

      const effectiveBankName = bankName === "Other Bank" ? customBankName.trim() : bankName;
      if (!effectiveBankName) {
        errors["bankName"] = "Please select or enter bank name";
        missing.push("Bank Name");
      }
      if (!accountHolder.trim()) {
        errors["accountHolder"] = "Please enter bank account holder name";
        missing.push("Account Holder Name");
      }
      const cleanAcc = accountNumber.trim();
      if (!cleanAcc || cleanAcc.length < 8) {
        errors["accountNumber"] = "Please enter a valid bank account number";
        missing.push("Bank Account Number");
      }
      if (cleanAcc !== confirmAccountNumber.trim()) {
        errors["confirmAccountNumber"] = "Account numbers do not match";
        missing.push("Matching Account Number Confirmation");
      }
      const cleanIfsc = ifsc.trim().toUpperCase();
      if (cleanIfsc.length !== 11) {
        errors["ifsc"] = "Please enter a valid 11-character IFSC code";
        missing.push("11-Character Bank IFSC Code");
      }
      if (!chequePhotoUrl) {
        errors["chequePhotoUrl"] = "Please upload Cancelled Cheque or Bank Passbook photo";
        missing.push("Cancelled Cheque or Passbook Photo");
      }

      if (missing.length > 0) {
        setFieldErrors(errors);
        setMissingSummary(missing);
        toast.error(`Please complete ${missing.length} banking fields`);
        triggerHaptic();
        setTimeout(() => {
          document.getElementById("missing-fields-banner")?.scrollIntoView({ behavior: "smooth", block: "start" });
        }, 50);
        return;
      }

      setCurrentStep(6);
      triggerHaptic();
      toast.success("Bank details saved. Moving to Step 6 (Agreement & Review)");
    }
  };

  const handlePrevStep = () => {
    if (currentStep > 1) {
      setCurrentStep((prev) => prev - 1);
      triggerHaptic();
    }
  };

  /* ------------------- Final Registration Submission ------------------- */

  const handleSubmitRegistration = async () => {
    if (!consentAadhaarEsign || !consentTermsAccepted) {
      toast.error("Please agree to the platform terms and consent checkboxes");
      triggerHaptic();
      return;
    }
    if (!agreementSignature?.signatureUrl) {
      toast.error("Please sign your digital signature before submitting");
      triggerHaptic();
      return;
    }

    setBusy(true);
    try {
      const effectiveBankName = bankName === "Other Bank" ? customBankName.trim() : bankName;
      const cleanPan = panNumber.trim().toUpperCase();
      const cleanAadhaar = aadhaarNumber.replace(/\D/g, "");

      const payload: BusinessRegistrationPayload = {
        businessName: shopName.trim(),
        ownerName: ownerName.trim(),
        category: (BUSINESS_TYPES.find((b) => b.id === businessType)?.category || "laundry") as BusinessCategory,
        gstin: gstin.trim().toUpperCase() || undefined,
        address: shopAddress.trim(),
        city: city.trim(),
        state: "Uttar Pradesh",
        area: area.trim() || undefined,
        pincode: pincode.trim(),
        servicePincodes: [pincode.trim()],
        sectors: area.trim() ? [area.trim()] : ["Central Sector"],
        openingTime,
        closingTime,
        weeklyOff,
        email: email.trim().toLowerCase() || undefined,
        phone: mobile.replace(/\D/g, "") || undefined,
        alternatePhone: alternatePhone.trim() || undefined,
        gender,
        dob: dob || undefined,
        pan: cleanPan,
        aadhaar: cleanAadhaar,
        ownerPhoto: ownerPhotoUrl,
        aadhaarFront: aadhaarFrontUrl,
        aadhaarBack: aadhaarBackUrl,
        panCard: panCardUrl,
        chequePhoto: chequePhotoUrl,
        experience,
        pickupRadiusKm: pickupRadius,
        deliveryRadiusKm: deliveryRadius,
        accountHolder: accountHolder.trim() || ownerName.trim(),
        bankName: effectiveBankName,
        accountNumber: accountNumber.trim(),
        ifsc: ifsc.trim().toUpperCase(),
        logo: logoUrl || undefined,
        banner: bannerUrl || undefined,
        gallery: galleryUrls,
        latitude: pickedLatitude,
        longitude: pickedLongitude,
        services: selectedServices.map((sId) => {
          const item = catalogServices.find((it) => it.id === sId) || DEFAULT_SERVICES.find((it) => it.id === sId);
          return {
            name: item?.name || sId,
            price: servicePrices[sId] ?? (item?.price || 79),
            unit: item?.unit || "pc",
            turnaroundHours: serviceTurnarounds[sId] ?? (item?.defaultHours || 24),
            enabled: true,
          };
        }),
        servicePrices,
        serviceTurnarounds,
        agreementSigned: true,
        signatureUrl: agreementSignature.signatureUrl,
        signedAt: agreementSignature.signedAt || new Date().toISOString(),
        signedByName: ownerName.trim(),
        agreementVersion: agreementSignature.agreementVersion || "QP-SLA-2026-v4.2",
      };

      const result = await registerBusiness(payload);

      // Play success chime & clear local draft
      playPartnerOrderChime();
      triggerHaptic();
      localStorage.removeItem(DRAFT_STORAGE_KEY);

      toast.success(
        isResubmissionFlow
          ? "Store application re-submitted successfully for Admin review! 🚀"
          : "Partner registration submitted successfully! 🎉"
      );

      signIn({
        partnerId: result.partnerId,
        phone: result.phone || mobile,
        email: result.email || email,
        businessName: result.businessName || shopName,
        ownerName: ownerName.trim(),
        city,
        isVerified: result.isVerified,
        isOnboarded: true,
      });

      navigate({ to: partnerRoutes.registrationSubmitted });
    } catch (err: any) {
      toast.error(err.message || "Failed to submit registration. Please verify all details.");
      triggerHaptic();
    } finally {
      setBusy(false);
    }
  };

  /* ------------------- Filtered Services Catalog ------------------- */

  const filteredCatalogServices = useMemo(() => {
    return catalogServices.filter((s) => {
      const matchCat =
        serviceCategoryTab === "all" ||
        s.category === serviceCategoryTab ||
        (serviceCategoryTab === "iron" && s.name.toLowerCase().includes("iron")) ||
        (serviceCategoryTab === "dry-clean" && s.name.toLowerCase().includes("dry clean")) ||
        (serviceCategoryTab === "wash" && s.name.toLowerCase().includes("wash")) ||
        (serviceCategoryTab === "premium" && (s.name.toLowerCase().includes("saree") || s.name.toLowerCase().includes("lehenga"))) ||
        (serviceCategoryTab === "shoe-care" && (s.name.toLowerCase().includes("shoe") || s.name.toLowerCase().includes("sneaker"))) ||
        (serviceCategoryTab === "home-care" && (s.name.toLowerCase().includes("blanket") || s.name.toLowerCase().includes("curtain")));

      const q = serviceSearchQuery.trim().toLowerCase();
      const matchSearch = !q || s.name.toLowerCase().includes(q) || (s.desc && s.desc.toLowerCase().includes(q));

      return matchCat && matchSearch;
    });
  }, [catalogServices, serviceCategoryTab, serviceSearchQuery]);

  const toggleService = (id: string) => {
    setSelectedServices((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleLocationPicked = (loc: PickedLocation) => {
    setPickedLatitude(loc.lat);
    setPickedLongitude(loc.lng);
    if (loc.address && !shopAddress) {
      setShopAddress(loc.address);
    }
    if (loc.pincode && loc.pincode.length === 6) {
      setPincode(loc.pincode);
    }
    if (loc.city) {
      const match = approvedCities.find((c) => c.toLowerCase() === loc.city?.toLowerCase());
      if (match) setCity(match);
    }
    setShowMapPicker(false);
    toast.success("Store location pinned on map ✓");
  };

  /* ----------------------------- Render ----------------------------- */

  return (
    <div className="min-h-screen bg-neutral-100 flex flex-col font-sans pb-28">
      <Toaster position="top-center" richColors />

      {/* 1. Top Header Bar */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-neutral-200 px-4 py-3 flex items-center justify-between shadow-2xs">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handlePrevStep}
            disabled={currentStep === 1}
            className="p-2 rounded-xl text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 transition disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
            aria-label="Previous Step"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-black text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                {t("QuickPress Partner", "QuickPress Partner")}
              </span>
              <span className="text-xs font-bold text-neutral-900">
                {t("Merchant Onboarding", "Merchant Onboarding")}
              </span>
            </div>
            <p className="text-[10px] text-neutral-500 font-medium">
              {t("Official Laundry & Dry-Cleaning Store Registration", "Official Laundry & Dry-Cleaning Store Registration")}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Prominent Language Switcher Button */}
          <button
            type="button"
            onClick={openLanguageModal}
            className="flex items-center gap-1.5 px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 text-xs font-extrabold rounded-xl transition active:scale-95 shadow-2xs cursor-pointer"
            title="Change Language / भाषा बदलें"
          >
            <Globe className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span className="uppercase">{language}</span>
          </button>

          <span className="text-[11px] font-bold px-2.5 py-1 bg-neutral-100 border border-neutral-200 text-neutral-700 rounded-lg shadow-2xs">
            {t("Step", "Step")} {currentStep} / 6
          </span>
        </div>
      </header>

      {/* 2. Step Progress Tracker (Clean Real Mobility App Style) */}
      <div className="bg-white px-4 pt-3 pb-3 border-b border-neutral-200 shadow-2xs">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-black text-neutral-800 tracking-tight">
            {t(STEPS[currentStep - 1]?.title, STEPS[currentStep - 1]?.title)}
          </span>
          <span className="text-[11px] font-bold text-emerald-700">
            {Math.round((currentStep / 6) * 100)}% {t("Completed", "Completed")}
          </span>
        </div>

        {/* Progress Line */}
        <div className="w-full h-1.5 bg-neutral-100 rounded-full overflow-hidden mb-3">
          <div
            className="h-full bg-[#00C853] transition-all duration-300"
            style={{ width: `${(currentStep / 6) * 100}%` }}
          />
        </div>

        {/* 6 Step Indicator Tabs */}
        <div className="grid grid-cols-6 gap-1 text-center">
          {STEPS.map((st) => {
            const isDone = currentStep > st.num;
            const isCurrent = currentStep === st.num;
            const Icon = st.icon;

            return (
              <div
                key={st.num}
                onClick={() => {
                  if (isDone) setCurrentStep(st.num);
                }}
                className={`flex flex-col items-center gap-1 transition-all ${
                  isDone ? "cursor-pointer" : ""
                } ${
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
                      ? "bg-[#00C853] border-[#00C853] text-white shadow-2xs"
                      : isCurrent
                      ? "bg-white border-[#00C853] text-[#00C853] ring-2 ring-emerald-100 shadow-2xs"
                      : "bg-white border-neutral-200 text-neutral-400"
                  }`}
                >
                  {isDone ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : <Icon className="w-3.5 h-3.5" />}
                </div>
                <span className="text-[10px] truncate max-w-full">{t(st.short, st.short)}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. Main Step Body Container */}
      <main className="max-w-xl w-full mx-auto p-4 flex-1">
        {/* Rejection / Resubmission Notification Alert */}
        {rejectionNotice && (
          <div className="mb-4 p-3.5 bg-red-50 border border-red-200 rounded-2xl flex items-start gap-3 text-xs text-red-900 shadow-2xs">
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-red-950">Previous Application Correction Request:</p>
              <p className="mt-0.5 text-red-800 font-medium">{rejectionNotice}</p>
              <p className="mt-1.5 text-[10px] text-red-700 font-bold uppercase tracking-wider">
                Please check the highlighted details below, re-upload documents, and re-submit for approval.
              </p>
            </div>
          </div>
        )}

        {!rejectionNotice && isResubmissionFlow && (
          <div className="mb-4 p-3 bg-indigo-50 border border-indigo-200 rounded-2xl flex items-center gap-2.5 text-xs text-indigo-900 shadow-2xs">
            <RotateCcw className="w-4 h-4 text-indigo-600 shrink-0 animate-spin" />
            <span className="font-bold">Editing &amp; Updating Submitted Partner Application Details</span>
          </div>
        )}

        <MissingFieldsAlert missingList={missingSummary} />

        {/* ========================================================
            STEP 1: PERSONAL DETAILS
        ======================================================== */}
        {currentStep === 1 && (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-200">
            <div className="p-4.5 bg-white border border-neutral-200 rounded-3xl space-y-4 shadow-xs">
              <div className="pb-3 border-b border-neutral-100 flex items-start justify-between">
                <div>
                  <h3 className="text-sm font-black text-neutral-900">Step 1: Personal Details</h3>
                  <p className="text-[11px] text-neutral-500 font-medium">
                    Enter the authorized store owner / proprietor information
                  </p>
                </div>
                <div className="p-2 rounded-2xl bg-emerald-50 text-emerald-700">
                  <UserRound className="w-5 h-5" />
                </div>
              </div>

              {/* Owner Full Name */}
              <div>
                <label className="block text-xs font-bold text-neutral-700 mb-1">
                  {t("Store Owner Full Name", "Owner Full Name")} <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={ownerName}
                    onChange={(e) => {
                      const val = e.target.value;
                      setOwnerName(val);
                      setAccountHolder(val);
                      if (fieldErrors["ownerName"]) {
                        setFieldErrors((prev) => {
                          const next = { ...prev };
                          delete next["ownerName"];
                          return next;
                        });
                      }
                    }}
                    placeholder="e.g. Ramesh Chandra Agrawal"
                    className={`w-full px-3.5 py-2.5 rounded-xl border text-xs font-semibold focus:outline-hidden focus:ring-2 transition ${
                      fieldErrors["ownerName"]
                        ? "border-red-400 bg-red-50/20 focus:ring-red-400"
                        : "border-neutral-200 focus:border-emerald-500 focus:ring-emerald-100"
                    }`}
                  />
                </div>
                <p className="mt-1 text-[10px] text-neutral-400">
                  {t("Name should match exactly with your Aadhaar and Bank Account", "Name should match exactly with your Aadhaar and Bank Account")}
                </p>
              </div>

              {/* Primary Mobile Phone (Prefilled / Verified) */}
              <div>
                <label className="block text-xs font-bold text-neutral-700 mb-1">
                  Primary Mobile Number <span className="text-red-500">*</span>
                </label>
                <div className="relative flex items-center">
                  <span className="absolute left-3.5 text-xs font-bold text-neutral-400">+91</span>
                  <input
                    type="tel"
                    value={mobile.replace(/^\+91/, "").replace(/\D/g, "").slice(0, 10)}
                    onChange={(e) => setMobile(`+91${e.target.value.replace(/\D/g, "").slice(0, 10)}`)}
                    placeholder="9876543210"
                    className={`w-full pl-12 pr-24 py-2.5 rounded-xl border text-xs font-semibold focus:outline-hidden focus:ring-2 transition ${
                      fieldErrors["mobile"]
                        ? "border-red-400 bg-red-50/20 focus:ring-red-400"
                        : "border-neutral-200 focus:border-emerald-500 focus:ring-emerald-100"
                    }`}
                  />
                  <span className="absolute right-3 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 flex items-center gap-1">
                    <Check className="w-3 h-3 text-[#00C853]" /> Verified OTP
                  </span>
                </div>
              </div>

              {/* Email Address */}
              <div>
                <label className="block text-xs font-bold text-neutral-700 mb-1">
                  Official Email Address <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ramesh.laundry@gmail.com"
                  className={`w-full px-3.5 py-2.5 rounded-xl border text-xs font-semibold focus:outline-hidden focus:ring-2 transition ${
                    fieldErrors["email"]
                      ? "border-red-400 bg-red-50/20 focus:ring-red-400"
                      : "border-neutral-200 focus:border-emerald-500 focus:ring-emerald-100"
                  }`}
                />
                <p className="mt-1 text-[10px] text-neutral-400">
                  Daily order invoices, SLA statements and payment receipts will be sent here
                </p>
              </div>

              {/* Gender Selection */}
              <div>
                <label className="block text-xs font-bold text-neutral-700 mb-1.5">Gender</label>
                <div className="grid grid-cols-3 gap-2">
                  {(["Male", "Female", "Other"] as const).map((g) => (
                    <button
                      key={g}
                      type="button"
                      onClick={() => setGender(g)}
                      className={`py-2 px-3 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                        gender === g
                          ? "bg-emerald-50 border-emerald-500 text-emerald-800 shadow-2xs"
                          : "bg-neutral-50/60 border-neutral-200 text-neutral-600 hover:bg-neutral-100"
                      }`}
                    >
                      {gender === g && <Check className="w-3 h-3 text-emerald-600" />}
                      <span>{g}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Date of Birth & Alternate Phone */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-neutral-700 mb-1">Date of Birth</label>
                  <input
                    type="date"
                    value={dob}
                    onChange={(e) => setDob(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-neutral-200 text-xs font-semibold focus:outline-hidden focus:ring-2 focus:ring-emerald-100"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-neutral-700 mb-1">Emergency / Alt. Mobile</label>
                  <input
                    type="tel"
                    value={alternatePhone}
                    onChange={(e) => setAlternatePhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                    placeholder="Optional 10-digit number"
                    className="w-full px-3 py-2 rounded-xl border border-neutral-200 text-xs font-semibold focus:outline-hidden focus:ring-2 focus:ring-emerald-100"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================
            STEP 2: AADHAAR, PAN & PHOTO (KYC)
        ======================================================== */}
        {currentStep === 2 && (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-200">
            {/* 1. Aadhaar Card Card */}
            <div className="p-4.5 bg-white border border-neutral-200 rounded-3xl space-y-3.5 shadow-xs">
              <div className="flex items-center justify-between pb-2 border-b border-neutral-100">
                <div className="flex items-center gap-2">
                  <div className="size-8 rounded-xl bg-sky-50 text-sky-700 flex items-center justify-center">
                    <IdCard className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-black text-neutral-900">{t("1. UIDAI Aadhaar Verification", "1. UIDAI Aadhaar Verification")}</h3>
                    <p className="text-[10px] text-neutral-500 font-medium">{t("12-Digit Government Aadhaar Card Number", "12-Digit Government Aadhaar Card Number")}</p>
                  </div>
                </div>
                {aadhaarNumber.replace(/\D/g, "").length === 12 && (
                  <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                    <BadgeCheck className="w-3 h-3 text-[#00C853]" /> {t("Valid 12 Digits ✓", "12 Digits Valid ✓")}
                  </span>
                )}
              </div>

              <div>
                <label className="block text-[11px] font-bold text-neutral-700 mb-1">
                  {t("12-Digit Aadhaar Card Number", "12-Digit Aadhaar Card Number")} <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  maxLength={14}
                  value={aadhaarNumber
                    .replace(/\D/g, "")
                    .slice(0, 12)
                    .replace(/(\d{4})/g, "$1 ")
                    .trim()}
                  onChange={(e) => {
                    const clean = e.target.value.replace(/\D/g, "").slice(0, 12);
                    setAadhaarNumber(clean);
                    if (fieldErrors["aadhaarNumber"]) {
                      setFieldErrors((prev) => {
                        const next = { ...prev };
                        delete next["aadhaarNumber"];
                        return next;
                      });
                    }
                  }}
                  placeholder="XXXX XXXX XXXX"
                  className={`w-full px-3.5 py-2.5 font-mono rounded-xl border text-xs tracking-wider font-semibold focus:outline-hidden focus:ring-2 transition ${
                    fieldErrors["aadhaarNumber"]
                      ? "border-red-400 bg-red-50/20"
                      : "border-neutral-200 focus:border-emerald-500 focus:ring-emerald-100"
                  }`}
                />
              </div>

              {/* Aadhaar Photos (Front & Back) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <DocumentUploadSlot
                  label={t("Aadhaar Front Photo", "Aadhaar Front Photo")}
                  sublabel={t("Clear photo of front side", "Clear photo of front side")}
                  docType="aadhaar_front"
                  value={aadhaarFrontUrl}
                  onChange={setAadhaarFrontUrl}
                  isUploading={isUploadingAadhaarFront}
                  setIsUploading={setIsUploadingAadhaarFront}
                  required
                  error={fieldErrors["aadhaarFrontUrl"]}
                />
                <DocumentUploadSlot
                  label={t("Aadhaar Back Photo", "Aadhaar Back Photo")}
                  sublabel={t("Back side with address", "Back side with address")}
                  docType="aadhaar_back"
                  value={aadhaarBackUrl}
                  onChange={setAadhaarBackUrl}
                  isUploading={isUploadingAadhaarBack}
                  setIsUploading={setIsUploadingAadhaarBack}
                  required
                  error={fieldErrors["aadhaarBackUrl"]}
                />
              </div>
            </div>

            {/* 2. Income Tax PAN Card */}
            <div className="p-4.5 bg-white border border-neutral-200 rounded-3xl space-y-3.5 shadow-xs">
              <div className="flex items-center justify-between pb-2 border-b border-neutral-100">
                <div className="flex items-center gap-2">
                  <div className="size-8 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center">
                    <CreditCard className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-black text-neutral-900">{t("2. Business PAN Card", "2. Business PAN Card")}</h3>
                    <p className="text-[10px] text-neutral-500 font-medium">{t("Income Tax Department PAN identification", "Income Tax Department PAN identification")}</p>
                  </div>
                </div>
                {/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(panNumber.trim().toUpperCase()) && (
                  <span className="text-[10px] font-bold text-purple-800 bg-purple-50 border border-purple-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                    <BadgeCheck className="w-3 h-3 text-purple-600" /> {t("Valid PAN Format ✓", "Valid PAN Format ✓")}
                  </span>
                )}
              </div>

              <div>
                <label className="block text-[11px] font-bold text-neutral-700 mb-1">
                  10-Character PAN Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  maxLength={10}
                  value={panNumber}
                  onChange={(e) => {
                    const clean = e.target.value.toUpperCase().slice(0, 10);
                    setPanNumber(clean);
                    if (fieldErrors["panNumber"]) {
                      setFieldErrors((prev) => {
                        const next = { ...prev };
                        delete next["panNumber"];
                        return next;
                      });
                    }
                  }}
                  placeholder="ABCDE1234F"
                  className={`w-full px-3.5 py-2.5 font-mono uppercase rounded-xl border text-xs tracking-wider font-semibold focus:outline-hidden focus:ring-2 transition ${
                    fieldErrors["panNumber"]
                      ? "border-red-400 bg-red-50/20"
                      : "border-neutral-200 focus:border-emerald-500 focus:ring-emerald-100"
                  }`}
                />
              </div>

              <DocumentUploadSlot
                label="PAN Card Photo"
                sublabel="Clear photo of physical PAN Card"
                docType="pan_card"
                value={panCardUrl}
                onChange={setPanCardUrl}
                isUploading={isUploadingPanCard}
                setIsUploading={setIsUploadingPanCard}
                required
                error={fieldErrors["panCardUrl"]}
              />
            </div>

            {/* 3. Owner Live Photo / Selfie */}
            <div className="p-4.5 bg-white border border-neutral-200 rounded-3xl space-y-3.5 shadow-xs">
              <div className="flex items-center justify-between pb-2 border-b border-neutral-100">
                <div className="flex items-center gap-2">
                  <div className="size-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
                    <Camera className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-black text-neutral-900">3. Store Owner Live Photo / Selfie</h3>
                    <p className="text-[10px] text-neutral-500 font-medium">
                      Capture official profile photo with device camera
                    </p>
                  </div>
                </div>
                {ownerPhotoUrl && (
                  <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                    <Check className="w-3 h-3 text-[#00C853]" /> Photo Saved
                  </span>
                )}
              </div>

              {ownerPhotoUrl ? (
                <div className="flex items-center gap-3 p-3 bg-neutral-50 border border-neutral-200 rounded-2xl">
                  <div className="size-16 rounded-xl overflow-hidden border border-neutral-300 shrink-0">
                    <img src={ownerPhotoUrl} alt="Owner" className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-neutral-900">Owner Live Photo Captured</p>
                    <p className="text-[10px] text-neutral-500">Verified official representative portrait</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsCameraModalOpen(true)}
                    className="px-3 py-1.5 bg-white border border-neutral-200 hover:bg-neutral-100 text-neutral-700 text-xs font-bold rounded-xl transition shadow-2xs"
                  >
                    Retake
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={() => setIsCameraModalOpen(true)}
                    className="w-full py-3.5 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md shadow-emerald-600/20 active:scale-95 transition"
                  >
                    <Camera className="w-4 h-4" />
                    Open Camera &amp; Take Live Selfie
                  </button>

                  <div className="text-center">
                    <span className="text-[10px] font-semibold text-neutral-400">or upload from device:</span>
                  </div>

                  <DocumentUploadSlot
                    label="Upload Owner Photo from Device"
                    sublabel="Upload high quality portrait photo"
                    docType="owner_photo"
                    value={ownerPhotoUrl}
                    onChange={setOwnerPhotoUrl}
                    isUploading={isUploadingOwnerPhoto}
                    setIsUploading={setIsUploadingOwnerPhoto}
                    error={fieldErrors["ownerPhotoUrl"]}
                  />
                </div>
              )}
            </div>
          </div>
        )}

        {/* ========================================================
            STEP 3: BUSINESS DETAILS & STORE PROFILE
        ======================================================== */}
        {currentStep === 3 && (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-200">
            <div className="p-4.5 bg-white border border-neutral-200 rounded-3xl space-y-4 shadow-xs">
              <div className="pb-3 border-b border-neutral-100 flex items-start justify-between">
                <div>
                  <h3 className="text-sm font-black text-neutral-900">Step 3: Business &amp; Store Details</h3>
                  <p className="text-[11px] text-neutral-500 font-medium">
                    Store information, location, operating hours, and storefront photos
                  </p>
                </div>
                <div className="p-2 rounded-2xl bg-emerald-50 text-emerald-700">
                  <Store className="w-5 h-5" />
                </div>
              </div>

              {/* Store Name */}
              <div>
                <label className="block text-xs font-bold text-neutral-700 mb-1">
                  Store / Business Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={shopName}
                  onChange={(e) => setShopName(e.target.value)}
                  placeholder="e.g. QuickPress Laundry Club"
                  className={`w-full px-3.5 py-2.5 rounded-xl border text-xs font-semibold focus:outline-hidden focus:ring-2 transition ${
                    fieldErrors["shopName"]
                      ? "border-red-400 bg-red-50/20"
                      : "border-neutral-200 focus:border-emerald-500 focus:ring-emerald-100"
                  }`}
                />
              </div>

              {/* Business Type / Category */}
              <div>
                <label className="block text-xs font-bold text-neutral-700 mb-1.5">
                  Business Category <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {BUSINESS_TYPES.map((bt) => (
                    <button
                      key={bt.id}
                      type="button"
                      onClick={() => setBusinessType(bt.id)}
                      className={`p-2.5 rounded-xl border text-left text-xs font-bold transition flex items-center justify-between ${
                        businessType === bt.id
                          ? "bg-emerald-50 border-emerald-500 text-emerald-900 shadow-2xs"
                          : "bg-neutral-50/60 border-neutral-200 text-neutral-600 hover:bg-neutral-100"
                      }`}
                    >
                      <span>{bt.label}</span>
                      {businessType === bt.id && <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />}
                    </button>
                  ))}
                </div>
              </div>

              {/* Experience & Optional GSTIN */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-neutral-700 mb-1">Years in Industry</label>
                  <select
                    value={experience}
                    onChange={(e) => setExperience(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-neutral-200 text-xs font-semibold bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-100"
                  >
                    {EXPERIENCE_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold text-neutral-700">GSTIN Number</label>
                    <span className="text-[10px] text-neutral-400">Optional (&lt;40L)</span>
                  </div>
                  <div className="flex gap-1.5">
                    <input
                      type="text"
                      maxLength={15}
                      value={gstin}
                      onChange={(e) => {
                        setGstin(e.target.value.toUpperCase());
                        if (gstVerified) setGstVerified(false);
                      }}
                      placeholder="15-digit GSTIN"
                      className="flex-1 px-3 py-2 font-mono uppercase rounded-xl border border-neutral-200 text-xs font-semibold"
                    />
                    {gstin.length === 15 && !gstVerified && (
                      <button
                        type="button"
                        onClick={handleVerifyGst}
                        disabled={verifyingGst}
                        className="px-2.5 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold"
                      >
                        {verifyingGst ? <Loader2 className="w-3 h-3 animate-spin" /> : "Verify"}
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Complete Store Address */}
              <div>
                <label className="block text-xs font-bold text-neutral-700 mb-1">
                  Full Store Address <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={2}
                  value={shopAddress}
                  onChange={(e) => setShopAddress(e.target.value)}
                  placeholder="Shop No., Ground Floor, Main Market, Landmark near Clock Tower..."
                  className={`w-full px-3.5 py-2 rounded-xl border text-xs font-medium focus:outline-hidden focus:ring-2 transition ${
                    fieldErrors["shopAddress"]
                      ? "border-red-400 bg-red-50/20"
                      : "border-neutral-200 focus:border-emerald-500 focus:ring-emerald-100"
                  }`}
                />
              </div>

              {/* City, Area & Pincode */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-neutral-700 mb-1">
                    City <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-neutral-200 text-xs font-semibold bg-white"
                  >
                    {approvedCities.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-neutral-700 mb-1">Area / Sector</label>
                  <input
                    type="text"
                    value={area}
                    onChange={(e) => setArea(e.target.value)}
                    placeholder="e.g. Gandhi Chowk"
                    className="w-full px-3 py-2 rounded-xl border border-neutral-200 text-xs font-medium"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-neutral-700 mb-1">
                    Pincode <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    maxLength={6}
                    value={pincode}
                    onChange={(e) => setPincode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    placeholder="207123"
                    className="w-full px-3 py-2 font-mono rounded-xl border border-neutral-200 text-xs font-bold text-center"
                  />
                </div>
              </div>

              {/* Pincode Serviceability Indicator */}
              {pincodeServiceability && (
                <div
                  className={`p-2.5 rounded-xl text-xs flex items-center justify-between border ${
                    pincodeServiceability.isServiceable
                      ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                      : "bg-amber-50 border-amber-200 text-amber-800"
                  }`}
                >
                  <span className="font-semibold flex items-center gap-1.5">
                    {pincodeServiceability.isServiceable ? (
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                    ) : (
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                    )}
                    {pincodeServiceability.isServiceable
                      ? `Serviceable Territory (${pincodeServiceability.city || city})`
                      : `Service pending launch in ${pincode}`}
                  </span>
                  <span className="text-[10px] font-bold uppercase">
                    {pincodeServiceability.isServiceable ? "Instant Active" : "Waitlist"}
                  </span>
                </div>
              )}

              {/* Interactive Map Pin Button */}
              <div className="p-3 bg-neutral-50 border border-neutral-200 rounded-2xl flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="size-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                    <MapPin className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-neutral-900">Pinpoint Store GPS on Map</p>
                    <p className="text-[10px] text-neutral-500">
                      Coords: {pickedLatitude.toFixed(4)}, {pickedLongitude.toFixed(4)}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowMapPicker(true)}
                  className="px-3 py-1.5 bg-white hover:bg-neutral-100 border border-neutral-200 text-neutral-800 text-xs font-bold rounded-xl transition shadow-2xs"
                >
                  Pick on Map
                </button>
              </div>

              {/* Store Timings */}
              <div className="p-3.5 bg-neutral-50/70 border border-neutral-200 rounded-2xl space-y-2.5">
                <p className="text-xs font-bold text-neutral-900 flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-emerald-600" /> Store Operating Schedule
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div>
                    <label className="text-[10px] font-bold text-neutral-500 uppercase">Opening Time</label>
                    <input
                      type="time"
                      value={openingTime}
                      onChange={(e) => setOpeningTime(e.target.value)}
                      className="w-full mt-0.5 px-2.5 py-1.5 rounded-lg border border-neutral-200 text-xs font-semibold bg-white"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-neutral-500 uppercase">Closing Time</label>
                    <input
                      type="time"
                      value={closingTime}
                      onChange={(e) => setClosingTime(e.target.value)}
                      className="w-full mt-0.5 px-2.5 py-1.5 rounded-lg border border-neutral-200 text-xs font-semibold bg-white"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-neutral-500 uppercase">Weekly Off</label>
                    <select
                      value={weeklyOff}
                      onChange={(e) => setWeeklyOff(e.target.value)}
                      className="w-full mt-0.5 px-2.5 py-1.5 rounded-lg border border-neutral-200 text-xs font-semibold bg-white"
                    >
                      {DAYS.map((d) => (
                        <option key={d} value={d}>
                          {d}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Store Profile Photos */}
              <div className="space-y-3 pt-2">
                <DocumentUploadSlot
                  label="Store Logo / Signboard Icon"
                  sublabel="Square store logo or signboard"
                  docType="store_logo"
                  value={logoUrl}
                  onChange={setLogoUrl}
                  isUploading={isUploadingLogo}
                  setIsUploading={setIsUploadingLogo}
                  required
                  error={fieldErrors["logoUrl"]}
                />
                <DocumentUploadSlot
                  label="Storefront Facade Banner"
                  sublabel="Exterior photo showing store front and street"
                  docType="store_banner"
                  value={bannerUrl}
                  onChange={setBannerUrl}
                  isUploading={isUploadingBanner}
                  setIsUploading={setIsUploadingBanner}
                  required
                  error={fieldErrors["bannerUrl"]}
                />
              </div>
            </div>
          </div>
        )}

        {/* ========================================================
            STEP 4: SERVICES SPECIFIC
        ======================================================== */}
        {currentStep === 4 && (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-200">
            <div className="p-4.5 bg-white border border-neutral-200 rounded-3xl space-y-4 shadow-xs">
              <div className="pb-3 border-b border-neutral-100 flex items-start justify-between">
                <div>
                  <h3 className="text-sm font-black text-neutral-900">Step 4: Services &amp; Rate Card</h3>
                  <p className="text-[11px] text-neutral-500 font-medium">
                    Select services offered, customize rates and turnaround time
                  </p>
                </div>
                <div className="p-2 rounded-2xl bg-emerald-50 text-emerald-700">
                  <Sparkles className="w-5 h-5" />
                </div>
              </div>

              {/* Category Filter Tabs */}
              <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                {SERVICE_CATEGORY_TABS.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setServiceCategoryTab(cat.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition ${
                      serviceCategoryTab === cat.id
                        ? "bg-emerald-600 text-white shadow-2xs"
                        : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200/80"
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>

              {/* Search box */}
              <div className="relative">
                <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={serviceSearchQuery}
                  onChange={(e) => setServiceSearchQuery(e.target.value)}
                  placeholder="Search service name (e.g. Suit, Saree, Shoe)..."
                  className="w-full pl-9 pr-3.5 py-2 rounded-xl border border-neutral-200 text-xs font-medium"
                />
              </div>

              {/* Service Cards List */}
              <div className="space-y-2.5 max-h-96 overflow-y-auto pr-1">
                {filteredCatalogServices.map((svc) => {
                  const isSelected = selectedServices.includes(svc.id);
                  const price = servicePrices[svc.id] ?? svc.price;
                  const turnaround = serviceTurnarounds[svc.id] ?? svc.defaultHours;

                  return (
                    <div
                      key={svc.id}
                      className={`p-3 rounded-2xl border transition-all ${
                        isSelected
                          ? "bg-emerald-50/50 border-emerald-300 ring-1 ring-emerald-300/40"
                          : "bg-white border-neutral-200 opacity-75 hover:opacity-100"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div
                          className="flex items-start gap-2.5 flex-1 cursor-pointer"
                          onClick={() => toggleService(svc.id)}
                        >
                          <div
                            className={`size-5 rounded-md border flex items-center justify-center shrink-0 mt-0.5 transition ${
                              isSelected ? "bg-emerald-600 border-emerald-600 text-white" : "border-neutral-300 bg-white"
                            }`}
                          >
                            {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                          </div>
                          <div>
                            <p className="text-xs font-black text-neutral-900">{svc.name}</p>
                            <p className="text-[10px] text-neutral-500 font-medium line-clamp-1">{svc.desc}</p>
                          </div>
                        </div>

                        {/* Price & Turnaround controls */}
                        {isSelected && (
                          <div className="flex items-center gap-2 shrink-0">
                            <div className="flex items-center gap-1 bg-white border border-neutral-200 rounded-lg px-2 py-1 shadow-2xs">
                              <span className="text-[10px] font-bold text-neutral-400">₹</span>
                              <input
                                type="number"
                                min={5}
                                value={price}
                                onChange={(e) =>
                                  setServicePrices((prev) => ({
                                    ...prev,
                                    [svc.id]: Number(e.target.value) || 0,
                                  }))
                                }
                                className="w-12 text-xs font-black text-neutral-900 focus:outline-hidden text-right"
                              />
                              <span className="text-[10px] text-neutral-500 font-medium">/{svc.unit}</span>
                            </div>

                            <select
                              value={turnaround}
                              onChange={(e) =>
                                setServiceTurnarounds((prev) => ({
                                  ...prev,
                                  [svc.id]: Number(e.target.value) || 24,
                                }))
                              }
                              className="text-[10px] font-bold bg-white border border-neutral-200 rounded-lg px-1.5 py-1 text-neutral-700"
                            >
                              <option value={12}>12h</option>
                              <option value={24}>24h</option>
                              <option value={36}>36h</option>
                              <option value={48}>48h</option>
                              <option value={72}>72h</option>
                            </select>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Service Delivery Radius Controls */}
              <div className="p-3.5 bg-neutral-50 border border-neutral-200 rounded-2xl space-y-3">
                <p className="text-xs font-bold text-neutral-900 flex items-center gap-1.5">
                  <Navigation className="w-4 h-4 text-emerald-600" /> Operational Territory Radius
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <div className="flex justify-between text-xs font-bold mb-1">
                      <span className="text-neutral-600">Pickup Radius:</span>
                      <span className="text-emerald-700 font-black">{pickupRadius} km</span>
                    </div>
                    <input
                      type="range"
                      min={2}
                      max={15}
                      step={1}
                      value={pickupRadius}
                      onChange={(e) => setPickupRadius(Number(e.target.value))}
                      className="w-full accent-emerald-600 cursor-pointer"
                    />
                  </div>
                  <div>
                    <div className="flex justify-between text-xs font-bold mb-1">
                      <span className="text-neutral-600">Delivery Radius:</span>
                      <span className="text-emerald-700 font-black">{deliveryRadius} km</span>
                    </div>
                    <input
                      type="range"
                      min={2}
                      max={25}
                      step={1}
                      value={deliveryRadius}
                      onChange={(e) => setDeliveryRadius(Number(e.target.value))}
                      className="w-full accent-emerald-600 cursor-pointer"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================
            STEP 5: BANK DETAILS
        ======================================================== */}
        {currentStep === 5 && (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-200">
            <div className="p-4.5 bg-white border border-neutral-200 rounded-3xl space-y-4 shadow-xs">
              <div className="pb-3 border-b border-neutral-100 flex items-start justify-between">
                <div>
                  <h3 className="text-sm font-black text-neutral-900">{t("Bank Details", "Step 5: Bank Account & Payouts")}</h3>
                  <p className="text-[11px] text-neutral-500 font-medium">
                    {t("Automated daily earnings settlement via RBI/NPCI", "Direct settlement account for daily payouts and earnings")}
                  </p>
                </div>
                <div className="p-2 rounded-2xl bg-emerald-50 text-emerald-700">
                  <Landmark className="w-5 h-5" />
                </div>
              </div>

              {/* Bank Selection */}
              <div>
                <label className="block text-xs font-bold text-neutral-700 mb-1">
                  {t("Select Bank Name", "Bank Name")} <span className="text-red-500">*</span>
                </label>
                <select
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 text-xs font-semibold bg-white"
                >
                  {INDIAN_BANKS.map((b) => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
                </select>
                {bankName === "Other Bank" && (
                  <input
                    type="text"
                    value={customBankName}
                    onChange={(e) => setCustomBankName(e.target.value)}
                    placeholder={t("Enter official bank name...", "Enter official bank name...")}
                    className="mt-2 w-full px-3.5 py-2 rounded-xl border border-neutral-200 text-xs font-semibold"
                  />
                )}
              </div>

              {/* Account Holder Name (Auto-synced with Step 1 Owner Name) */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-neutral-700">
                    {t("Beneficiary / Account Holder Name", "Beneficiary / Account Holder Name")} <span className="text-red-500">*</span>
                  </label>
                  <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                    <UserCheck className="w-3 h-3 text-[#00C853]" />
                    {t("Same as Store Owner Name", "Same as Store Owner Name")}
                  </span>
                </div>
                <input
                  type="text"
                  value={accountHolder || ownerName}
                  onChange={(e) => setAccountHolder(e.target.value)}
                  placeholder={t("Exact name as in bank records", "Exact name as in bank records")}
                  className={`w-full px-3.5 py-2.5 rounded-xl border text-xs font-semibold focus:outline-hidden focus:ring-2 transition ${
                    fieldErrors["accountHolder"]
                      ? "border-red-400 bg-red-50/20"
                      : "border-neutral-200 focus:border-emerald-500 focus:ring-emerald-100"
                  }`}
                />
                <p className="mt-1 text-[10px] text-neutral-500">
                  {t("Auto-filled from Step 1 Owner Name to ensure matching KYC & payout settlement", `Auto-filled: ${ownerName || "Owner Name"}`)}
                </p>
              </div>

              {/* Account Number & Confirm Account Number */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-neutral-700 mb-1">
                    {t("Account Number", "Account Number")} <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="password"
                    value={accountNumber}
                    onChange={(e) => {
                      setAccountNumber(e.target.value.replace(/\D/g, ""));
                    }}
                    placeholder={t("Bank Account Number", "Account Number")}
                    className="w-full px-3.5 py-2.5 font-mono rounded-xl border border-neutral-200 text-xs font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-neutral-700 mb-1">
                    {t("Re-Enter Account Number", "Re-Enter Account Number")} <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={confirmAccountNumber}
                    onChange={(e) => setConfirmAccountNumber(e.target.value.replace(/\D/g, ""))}
                    placeholder={t("Re-Enter Account Number", "Confirm Account Number")}
                    className={`w-full px-3.5 py-2.5 font-mono rounded-xl border text-xs font-semibold ${
                      confirmAccountNumber && confirmAccountNumber !== accountNumber
                        ? "border-red-400 bg-red-50/20"
                        : "border-neutral-200"
                    }`}
                  />
                </div>
              </div>

              {/* IFSC Code with Real Live RBI Verification */}
              <div>
                <label className="block text-xs font-bold text-neutral-700 mb-1">
                  {t("11-Character Bank IFSC Code", "11-Character Bank IFSC Code")} <span className="text-red-500">*</span>
                </label>
                <div className="relative flex items-center">
                  <input
                    type="text"
                    maxLength={11}
                    value={ifsc}
                    onChange={(e) => {
                      const clean = e.target.value.toUpperCase().slice(0, 11);
                      setIfsc(clean);
                      if (clean.length === 11) {
                        autoVerifyIfscCode(clean);
                      } else if (ifscDetails) {
                        setIfscDetails(null);
                      }
                    }}
                    placeholder="e.g. SBIN0000691"
                    className={`w-full px-3.5 py-2.5 font-mono uppercase rounded-xl border text-xs font-semibold focus:outline-hidden focus:ring-2 transition ${
                      fieldErrors["ifsc"]
                        ? "border-red-400 bg-red-50/20"
                        : "border-neutral-200 focus:border-emerald-500 focus:ring-emerald-100"
                    }`}
                  />
                  {verifyingIfsc && (
                    <div className="absolute right-3 flex items-center gap-1.5 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-600" />
                      <span>RBI Database...</span>
                    </div>
                  )}
                </div>
                {fieldErrors["ifsc"] && (
                  <p className="mt-1 text-[11px] font-semibold text-red-500">{fieldErrors["ifsc"]}</p>
                )}

                {/* Real Live Bank Details from RBI Database */}
                {ifscDetails && (
                  <div className="mt-2 p-3 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-start gap-2.5 text-xs animate-in fade-in duration-200">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <div className="space-y-0.5">
                      <div className="font-bold text-emerald-950 flex items-center gap-1.5">
                        <span>{ifscDetails.bank}</span>
                        <span className="text-[10px] bg-emerald-200/80 text-emerald-900 font-extrabold px-1.5 py-0.2 rounded-full">
                          {t("RBI Verified ✓", "RBI Verified ✓")}
                        </span>
                      </div>
                      <p className="text-[11px] text-emerald-800">
                        Branch: <strong>{ifscDetails.branch}</strong> · City: {ifscDetails.city}{ifscDetails.state ? `, ${ifscDetails.state}` : ""}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Cancelled Cheque / Passbook upload */}
              <DocumentUploadSlot
                label={t("Cancelled Cheque or Bank Passbook Photo", "Cancelled Cheque or Bank Passbook Photo")}
                sublabel={t("Photo showing Account No., IFSC & Account Name", "Photo showing Account No., IFSC & Account Name")}
                docType="bank_cheque"
                value={chequePhotoUrl}
                onChange={setChequePhotoUrlUrl}
                isUploading={isUploadingCheque}
                setIsUploading={setIsUploadingCheque}
                required
                error={fieldErrors["chequePhotoUrl"]}
              />
            </div>
          </div>
        )}

        {/* ========================================================
            STEP 6: AGREEMENT & SUBMIT
        ======================================================== */}
        {currentStep === 6 && (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-200">
            {/* Complete Application Review Summary */}
            <div className="p-4.5 bg-white border border-neutral-200 rounded-3xl space-y-3.5 shadow-xs">
              <div className="flex items-center justify-between pb-2 border-b border-neutral-100">
                <h3 className="text-sm font-black text-neutral-900">Application Summary</h3>
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                  Ready for Submission
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2.5 bg-neutral-50 rounded-xl border border-neutral-200/70">
                  <p className="text-[10px] text-neutral-400 font-bold uppercase">Owner Name</p>
                  <p className="font-bold text-neutral-900 truncate">{ownerName || "—"}</p>
                </div>
                <div className="p-2.5 bg-neutral-50 rounded-xl border border-neutral-200/70">
                  <p className="text-[10px] text-neutral-400 font-bold uppercase">Store Name</p>
                  <p className="font-bold text-neutral-900 truncate">{shopName || "—"}</p>
                </div>
                <div className="p-2.5 bg-neutral-50 rounded-xl border border-neutral-200/70">
                  <p className="text-[10px] text-neutral-400 font-bold uppercase">Aadhaar (UIDAI)</p>
                  <p className="font-bold text-neutral-900">
                    {aadhaarNumber ? `XXXX-XXXX-${aadhaarNumber.slice(-4)}` : "—"}
                  </p>
                </div>
                <div className="p-2.5 bg-neutral-50 rounded-xl border border-neutral-200/70">
                  <p className="text-[10px] text-neutral-400 font-bold uppercase">PAN Number</p>
                  <p className="font-bold text-neutral-900">{panNumber || "—"}</p>
                </div>
                <div className="p-2.5 bg-neutral-50 rounded-xl border border-neutral-200/70">
                  <p className="text-[10px] text-neutral-400 font-bold uppercase">City &amp; Pincode</p>
                  <p className="font-bold text-neutral-900 truncate">{city} ({pincode})</p>
                </div>
                <div className="p-2.5 bg-neutral-50 rounded-xl border border-neutral-200/70">
                  <p className="text-[10px] text-neutral-400 font-bold uppercase">Bank Settlement</p>
                  <p className="font-bold text-neutral-900 truncate">
                    {bankName.split("(")[0]} · {accountNumber ? `XX${accountNumber.slice(-4)}` : "—"}
                  </p>
                </div>
              </div>
            </div>

            {/* Master Partner Agreement & E-Signature Pad */}
            <div className="p-4.5 bg-white border border-neutral-200 rounded-3xl space-y-4 shadow-xs">
              <div className="pb-2 border-b border-neutral-100 flex items-start justify-between">
                <div>
                  <h3 className="text-sm font-black text-neutral-900">Master Merchant SLA &amp; E-Signature</h3>
                  <p className="text-[11px] text-neutral-500 font-medium">
                    Read agreement terms and draw your authorized signature
                  </p>
                </div>
                <div className="p-2 rounded-2xl bg-emerald-50 text-emerald-700">
                  <FileCheck2 className="w-5 h-5" />
                </div>
              </div>

              {/* Embedded Signature Pad */}
              <PartnerAgreementSignaturePad
                ownerName={ownerName}
                storeName={shopName}
                aadhaar={aadhaarNumber}
                pan={panNumber}
                city={city}
                initialSignature={agreementSignature?.signatureUrl}
                onSignatureConfirmed={(data) => {
                  setAgreementSignature(data);
                  setConsentAadhaarEsign(true);
                  setConsentTermsAccepted(true);
                }}
              />

              {/* Consent Checkboxes */}
              <div className="space-y-2 pt-2 border-t border-neutral-100">
                <label className="flex items-start gap-2.5 cursor-pointer text-xs font-semibold text-neutral-800">
                  <input
                    type="checkbox"
                    checked={consentAadhaarEsign}
                    onChange={(e) => setConsentAadhaarEsign(e.target.checked)}
                    className="size-4 mt-0.5 accent-emerald-600 rounded"
                  />
                  <span>
                    I confirm that the provided Aadhaar, PAN and Bank details belong to me and all information is 100% accurate.
                  </span>
                </label>
                <label className="flex items-start gap-2.5 cursor-pointer text-xs font-semibold text-neutral-800">
                  <input
                    type="checkbox"
                    checked={consentTermsAccepted}
                    onChange={(e) => setConsentTermsAccepted(e.target.checked)}
                    className="size-4 mt-0.5 accent-emerald-600 rounded"
                  />
                  <span>
                    I accept the QuickPress Laundry Franchise SLA Agreement, applicable platform commission tiers, and service quality standards.
                  </span>
                </label>
              </div>

              {/* Final Submit Button */}
              <button
                type="button"
                disabled={busy || !consentAadhaarEsign || !consentTermsAccepted || !agreementSignature?.signatureUrl}
                onClick={handleSubmitRegistration}
                className="w-full py-4 px-6 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm shadow-lg shadow-emerald-600/25 active:scale-98 transition disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {busy ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>{t("Submitting...", "Submitting Partner Application...")}</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-5 h-5 stroke-[2.5]" />
                    <span>
                      {isResubmissionFlow
                        ? t("Re-Submit Application for Approval", "Re-Submit Application for Approval")
                        : t("Submit Application", "Submit Registration for Approval")}
                    </span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </main>

      {/* 4. Sticky Bottom Action Bar (Steps 1 to 5) */}
      {currentStep < 6 && (
        <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-neutral-200 px-4 py-3 shadow-lg">
          <div className="max-w-xl mx-auto flex items-center gap-3">
            {currentStep > 1 && (
              <button
                type="button"
                onClick={handlePrevStep}
                className="py-3 px-4 rounded-2xl border border-neutral-200 hover:bg-neutral-100 text-neutral-700 font-bold text-xs transition active:scale-95 shrink-0 cursor-pointer"
              >
                {t("Back", "Back")}
              </button>
            )}

            <button
              type="button"
              onClick={handleNextStep}
              className="flex-1 py-3.5 px-5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs shadow-md shadow-emerald-600/20 active:scale-98 transition flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>{t("Save & Continue", `Continue to Step ${currentStep + 1}`)}</span>
              <ArrowRight className="w-4 h-4 stroke-[2.5]" />
            </button>
          </div>
        </div>
      )}

      {/* 5. Modals */}
      {/* Live Selfie Capture Modal */}
      <SimpleSelfieCaptureModal
        isOpen={isCameraModalOpen}
        onClose={() => setIsCameraModalOpen(false)}
        onCapture={(dataUrl) => {
          setOwnerPhotoUrl(dataUrl);
          setIsCameraModalOpen(false);
          toast.success("Owner live photo captured successfully! ✓");
        }}
      />



      {/* Interactive Map Picker Modal */}
      {showMapPicker && (
        <MapPicker
          isOpen={showMapPicker}
          initialLat={pickedLatitude}
          initialLng={pickedLongitude}
          initialAddress={shopAddress}
          onClose={() => setShowMapPicker(false)}
          onLocationPicked={handleLocationPicked}
        />
      )}
    </div>
  );
}
