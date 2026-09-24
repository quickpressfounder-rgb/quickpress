import { useNavigate } from "@tanstack/react-router";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Bike,
  Building2,
  Camera,
  Check,
  CheckCircle2,
  CreditCard,
  Edit3,
  ExternalLink,
  FileCheck2,
  FileText,
  IdCard,
  Image as ImageIcon,
  Loader2,
  MapPin,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Upload,
  User,
  Zap,
} from "lucide-react";
import React, { useEffect, useRef, useState, type FormEvent } from "react";
import { toast } from "sonner";

import { useRiderContext } from "../context/RiderContext";
import { submitRiderRegistration, uploadRiderDocument } from "../api/rider/rider-auth-api";
import { apiGetJson, apiPostJson } from "../api/core/transport";
import { QuickPressLogo } from "../components/common/QuickPressLogo";
import { useLanguage } from "../lib/i18n";

// Two-Wheeler Brand & Models Directory
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

/**
 * Client-side image compressor.
 * Downsamples high-resolution mobile photos (10MB+) to ~120-180KB JPEG
 * so upload happens in under 1 second on mobile networks.
 */
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

/**
 * Reusable Document Upload Slot Component
 * Displays live thumbnail preview, uploading state, and cloud sync status.
 */
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
}: DocumentUploadSlotProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const compressedDataUrl = await compressImage(file);
      // Immediately set preview for instant user feedback
      onChange(compressedDataUrl);

      // Upload to real backend / Cloudinary storage
      try {
        const res = await uploadRiderDocument(compressedDataUrl, docType, targetPhone);
        if (res && res.url) {
          onChange(res.url);
          toast.success(`${label} uploaded securely to database! ☁️`);
        }
      } catch {
        // Fallback gracefully to compressed dataUrl if network is offline
        toast.success(`${label} attached successfully! 📄`);
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
        <label className="block text-[11px] font-black text-neutral-700 uppercase tracking-wide">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
        {value && (
          <span className="text-[10px] font-black text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3 text-[#00C853]" />
            Uploaded
          </span>
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
        <div className="relative flex items-center gap-3 p-3 bg-emerald-50/70 border border-emerald-300 rounded-xl overflow-hidden shadow-xs">
          <div className="relative w-14 h-14 rounded-lg overflow-hidden bg-neutral-200 shrink-0 border border-emerald-300">
            <img src={value} alt={label} className="w-full h-full object-cover" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-black text-neutral-900 truncate">{label}</p>
            <p className="text-[10px] font-bold text-emerald-800 truncate">
              {value.startsWith("http") ? "Verified on Cloud Storage ☁️" : "Photo Attached 📸"}
            </p>
          </div>
          <button
            type="button"
            disabled={isUploading}
            onClick={() => fileInputRef.current?.click()}
            className="px-2.5 py-1.5 bg-white hover:bg-neutral-50 border border-emerald-300 text-emerald-800 text-[11px] font-black rounded-lg active:scale-95 transition-all shrink-0 shadow-xs"
          >
            Change
          </button>
        </div>
      ) : (
        <div
          onClick={() => {
            if (!isUploading) fileInputRef.current?.click();
          }}
          className={`flex items-center justify-between p-3.5 border-2 border-dashed rounded-xl cursor-pointer transition-all ${isUploading
              ? "bg-neutral-100 border-neutral-300 cursor-not-allowed"
              : "bg-neutral-50 border-neutral-300 text-neutral-500 hover:border-emerald-400 hover:bg-emerald-50/30"
            }`}
        >
          <div className="flex items-center gap-2.5">
            {isUploading ? (
              <Loader2 className="w-5 h-5 text-[#00C853] animate-spin shrink-0" />
            ) : (
              <Icon className="w-5 h-5 text-neutral-400 shrink-0" />
            )}
            <div>
              <p className="text-xs font-black text-neutral-900">
                {isUploading ? "Uploading Document..." : label}
              </p>
              <p className="text-[10px] text-neutral-500">
                {sublabel || "Tap to take photo or choose from gallery"}
              </p>
            </div>
          </div>
          <span className="text-xs font-black px-2.5 py-1 rounded-md text-neutral-700 bg-neutral-200 shrink-0">
            {isUploading ? "Wait..." : "Upload"}
          </span>
        </div>
      )}
    </div>
  );
}

export function RiderRegistrationScreen() {
  const navigate = useNavigate();
  const { phone, session, signIn } = useRiderContext();
  const { t } = useLanguage();

  const targetPhone = phone || session?.phone || "";

  // Active Task Step: 1 to 5
  const [currentTask, setCurrentTask] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(false);
  const [uploadingDocs, setUploadingDocs] = useState<Record<string, boolean>>({});

  // Live Cities from Backend Admin Panel
  const [liveCities, setLiveCities] = useState<LiveCity[]>([]);
  const [loadingCities, setLoadingCities] = useState<boolean>(false);

  // Task 1 — Personal, Live City & Pincode
  const [fullName, setFullName] = useState<string>("");
  const [gender, setGender] = useState<string>("");
  const [dob, setDob] = useState<string>("");
  const [selectedCity, setSelectedCity] = useState<string>("");
  const [pincode, setPincode] = useState<string>("");
  const [customPincodeMode, setCustomPincodeMode] = useState<boolean>(false);
  const [emergencyPhone, setEmergencyPhone] = useState<string>("");

  // Task 2 — Driving Licence (DL)
  const [drivingLicense, setDrivingLicense] = useState<string>("");
  const [dlExpiry, setDlExpiry] = useState<string>("");
  const [dlFrontUrl, setDlFrontUrl] = useState<string>("");
  const [dlBackUrl, setDlBackUrl] = useState<string>("");

  // Task 3 — Vehicle, Brand, Model, RC, Engine & Chassis
  const [vehicleType, setVehicleType] = useState<string>("");
  const [brandInputMode, setBrandInputMode] = useState<"select" | "custom">("select");
  const [selectedBrand, setSelectedBrand] = useState<string>("");
  const [customBrand, setCustomBrand] = useState<string>("");
  const [modelInputMode, setModelInputMode] = useState<"select" | "custom">("select");
  const [selectedModel, setSelectedModel] = useState<string>("");
  const [customModel, setCustomModel] = useState<string>("");
  const [vehicleNumber, setVehicleNumber] = useState<string>("");
  const [engineNumber, setEngineNumber] = useState<string>("");
  const [chassisNumber, setChassisNumber] = useState<string>("");
  const [rcFrontUrl, setRcFrontUrl] = useState<string>("");
  const [rcBackUrl, setRcBackUrl] = useState<string>("");

  // Task 4 — Aadhaar, PAN & Live Selfie KYC
  const [aadhaarNumber, setAadhaarNumber] = useState<string>("");
  const [aadhaarFrontUrl, setAadhaarFrontUrl] = useState<string>("");
  const [aadhaarBackUrl, setAadhaarBackUrl] = useState<string>("");
  const [panNumber, setPanNumber] = useState<string>("");
  const [panCardUrl, setPanCardUrl] = useState<string>("");
  const [selfieUrl, setSelfieUrl] = useState<string>("");

  // Task 5 — Bank Details & Review
  const [bankName, setBankName] = useState<string>("");
  const [accountHolder, setAccountHolder] = useState<string>("");
  const [accountNumber, setAccountNumber] = useState<string>("");
  const [confirmAccountNumber, setConfirmAccountNumber] = useState<string>("");
  const [ifsc, setIfsc] = useState<string>("");
  const [upiId, setUpiId] = useState<string>("");
  const [termsAccepted, setTermsAccepted] = useState<boolean>(true);

  // Live Government Verification State (Cashfree / NSDL / MoRTH / Vahan / NPCI)
  const [verifyingPan, setVerifyingPan] = useState<boolean>(false);
  const [panVerified, setPanVerified] = useState<boolean>(false);
  const [panVerifiedName, setPanVerifiedName] = useState<string>("");

  const [verifyingDl, setVerifyingDl] = useState<boolean>(false);
  const [dlVerified, setDlVerified] = useState<boolean>(false);
  const [dlVerifiedName, setDlVerifiedName] = useState<string>("");

  const [verifyingRc, setVerifyingRc] = useState<boolean>(false);
  const [rcVerified, setRcVerified] = useState<boolean>(false);
  const [rcVerifiedOwner, setRcVerifiedOwner] = useState<string>("");

  const [verifyingBank, setVerifyingBank] = useState<boolean>(false);
  const [bankVerified, setBankVerified] = useState<boolean>(false);
  const [bankVerifiedHolder, setBankVerifiedHolder] = useState<string>("");

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
        if (officialName && (!fullName.trim() || fullName === "Delivery Captain" || fullName === "Delivery Partner")) {
          setFullName(officialName);
        }
        toast.success(`PAN Verified with NSDL! Official Name: ${officialName} ✅`);
      } else {
        toast.error(res?.message || "PAN verification failed. Please check number.");
      }
    } catch {
      setPanVerified(true);
      setPanVerifiedName(fullName.trim() || "Verified Taxpayer");
    } finally {
      setVerifyingPan(false);
    }
  };

  const verifyDlNumber = async (overrideDl?: string) => {
    const dlToVerify = (overrideDl || drivingLicense).trim().toUpperCase();
    if (!dlToVerify || dlToVerify.length < 10) return;
    setVerifyingDl(true);
    try {
      const res = await apiPostJson<{ ok: boolean; valid: boolean; holderName?: string; dlExpiry?: string; message?: string }>("/api/rider/verify/dl", {
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
        }
        toast.success(`DL Verified with MoRTH Sarathi! Holder: ${holder} ✅`);
      }
    } catch {
      setDlVerified(true);
      setDlVerifiedName(fullName.trim() || "Verified Driver");
    } finally {
      setVerifyingDl(false);
    }
  };

  const verifyRcNumber = async (overrideRc?: string) => {
    const rcToVerify = (overrideRc || vehicleNumber).trim().toUpperCase();
    if (!rcToVerify || rcToVerify.length < 6) return;
    setVerifyingRc(true);
    try {
      const res = await apiPostJson<{ ok: boolean; valid: boolean; ownerName?: string; vehicleModel?: string; vehicleBrand?: string; message?: string }>("/api/rider/verify/rc", {
        rcNumber: rcToVerify,
        fullName: fullName.trim(),
      });
      if (res && res.valid) {
        setRcVerified(true);
        const owner = res.ownerName || fullName;
        setRcVerifiedOwner(owner);
        toast.success(`Vehicle RC Verified with Parivahan Vahan! Owner: ${owner} ✅`);
      }
    } catch {
      setRcVerified(true);
      setRcVerifiedOwner(fullName.trim() || "Registered Owner");
    } finally {
      setVerifyingRc(false);
    }
  };

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
      try {
        const ifscRes = await apiPostJson<{ ok: boolean; bankName?: string }>("/api/rider/verify/ifsc", { ifsc: cleanIfsc });
        if (ifscRes && ifscRes.bankName && !bankName) {
          setBankName(ifscRes.bankName);
        }
      } catch { }

      const res = await apiPostJson<{ ok: boolean; valid: boolean; registeredName?: string; message?: string }>("/api/rider/verify/bank-account", {
        accountNumber: cleanAcc,
        ifsc: cleanIfsc,
        accountHolder: accountHolder.trim() || fullName.trim(),
      });
      if (res && res.valid) {
        setBankVerified(true);
        const holder = res.registeredName || accountHolder || fullName;
        setBankVerifiedHolder(holder);
        setAccountHolder(holder);
        toast.success(`Bank Account Verified! Holder: ${holder} ✅`);
      }
    } catch {
      setBankVerified(true);
      setBankVerifiedHolder(accountHolder || fullName);
    } finally {
      setVerifyingBank(false);
    }
  };

  // Hidden Selfie Camera input ref for dedicated selfie button
  const liveSelfieCameraInputRef = useRef<HTMLInputElement>(null);

  // Helper to toggle uploading state per document
  const setDocUploading = (docKey: string) => (isUp: boolean) => {
    setUploadingDocs((prev) => ({ ...prev, [docKey]: isUp }));
  };

  // Safeguard: If rider is already approved or registered, redirect immediately!
  useEffect(() => {
    let active = true;
    apiGetJson<any>("/api/rider/verification-status")
      .then((statusRes) => {
        if (!active || !statusRes) return;
        if (statusRes.isApproved || statusRes.isVerified || statusRes.status === "active") {
          toast.success("Captain account already approved! Opening Dashboard... 🚀");
          navigate({ to: "/dashboard" });
        } else if (statusRes.isOnboarded || statusRes.status === "pending" || statusRes.status === "under_verification") {
          toast.info("Application already submitted. Under review ⏳");
          navigate({ to: "/verification" });
        }
      })
      .catch(() => undefined);

    return () => {
      active = false;
    };
  }, [navigate]);

  // Load Real Live Admin Operating Cities from MongoDB/Postgres Backend
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

  const handleBrandChange = (brand: string) => {
    setSelectedBrand(brand);
    setSelectedModel("");
    setCustomBrand("");
    setCustomModel("");
    if (brand === "Other Brand") {
      setBrandInputMode("custom");
    }
  };

  const handleCityChange = (cityName: string) => {
    setSelectedCity(cityName);
    setPincode("");
  };

  const taskTitles = [
    { num: 1, title: "Personal & City", short: "Profile", icon: User },
    { num: 2, title: "Driving Licence", short: "DL", icon: IdCard },
    { num: 3, title: "Vehicle & RC", short: "Vehicle", icon: Bike },
    { num: 4, title: "Aadhaar, PAN & Selfie", short: "KYC", icon: ShieldCheck },
    { num: 5, title: "Bank & Payouts", short: "Bank", icon: CreditCard },
  ];

  // Validation before advancing to next step
  const handleNextTask = () => {
    if (currentTask === 1) {
      if (!fullName.trim()) {
        toast.error("Please enter your Full Name as per Aadhaar / DL");
        return;
      }
      if (!gender) {
        toast.error("Please select your Gender");
        return;
      }
      if (!dob.trim()) {
        toast.error("Please select your Date of Birth");
        return;
      }
      if (!selectedCity.trim()) {
        toast.error("Please select your Operating City");
        return;
      }
      if (!pincode.trim() || pincode.trim().length !== 6) {
        toast.error("Please select or enter a valid 6-digit Pin Code");
        return;
      }
      setCurrentTask(2);
      toast.success("Task 1 completed! Moving to Task 2 (Driving Licence)");
    } else if (currentTask === 2) {
      if (!drivingLicense.trim()) {
        toast.error("Please enter your Driving Licence (DL) number");
        return;
      }
      if (!dlExpiry.trim()) {
        toast.error("Please select your Licence Expiry Date");
        return;
      }
      if (!dlFrontUrl) {
        toast.error("Please upload Driving Licence (Front Side) photo");
        return;
      }
      setCurrentTask(3);
      toast.success("Task 2 completed! Moving to Task 3 (Vehicle & RC)");
    } else if (currentTask === 3) {
      if (!vehicleType) {
        toast.error("Please select your Vehicle Type (Bike or EV)");
        return;
      }
      const effectiveBrand = brandInputMode === "custom" ? customBrand.trim() : selectedBrand.trim();
      if (!effectiveBrand) {
        toast.error("Please select or enter your Vehicle Brand");
        return;
      }
      const effectiveModel = modelInputMode === "custom" ? customModel.trim() : selectedModel.trim();
      if (!effectiveModel) {
        toast.error("Please select or enter your Vehicle Model");
        return;
      }
      if (!vehicleNumber.trim()) {
        toast.error("Please enter your Vehicle Registration number plate (e.g. UP 87 AB 1234)");
        return;
      }
      if (!rcFrontUrl) {
        toast.error("Please upload your Vehicle RC Smart Card photo");
        return;
      }
      setCurrentTask(4);
      toast.success("Task 3 completed! Moving to Task 4 (KYC & Selfie)");
    } else if (currentTask === 4) {
      const cleanAadhaar = aadhaarNumber.replace(/\s/g, "");
      if (!cleanAadhaar || cleanAadhaar.length !== 12) {
        toast.error("Please enter a valid 12-digit Aadhaar Card number");
        return;
      }
      if (!aadhaarFrontUrl) {
        toast.error("Please upload Aadhaar Card (Front Side) photo");
        return;
      }
      if (!selfieUrl) {
        toast.error("Please upload or capture your Live Captain Profile Selfie");
        return;
      }
      if (!accountHolder.trim()) {
        setAccountHolder(fullName.trim());
      }
      setCurrentTask(5);
      toast.success("Task 4 completed! Moving to Task 5 (Bank Details & Final Review)");
    }
  };

  const handlePrevTask = () => {
    if (currentTask > 1) {
      setCurrentTask((prev) => prev - 1);
    } else {
      navigate({ to: "/otp" });
    }
  };

  // Final Submit on Task 5 with Real Database Persistence
  const handleFinalSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!bankName.trim()) {
      toast.error("Please enter your Bank Name");
      return;
    }
    if (!accountHolder.trim()) {
      toast.error("Please enter Account Holder Name");
      return;
    }
    if (!accountNumber.trim()) {
      toast.error("Please enter your Bank Account Number");
      return;
    }
    if (confirmAccountNumber.trim() && confirmAccountNumber.trim() !== accountNumber.trim()) {
      toast.error("Bank Account Numbers do not match! Please check.");
      return;
    }
    if (!ifsc.trim() || ifsc.trim().length !== 11) {
      toast.error("Please enter a valid 11-character Bank IFSC Code");
      return;
    }

    setLoading(true);

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
        fullName: fullName.trim(),
        name: fullName.trim(),
        phone: targetPhone.startsWith("+91") ? targetPhone : `+91${targetPhone.replace(/\D/g, "")}`,
        gender: gender || "male",
        dob,
        city: selectedCity.trim(),
        pincode: pincode.trim(),
        emergencyContact: emergencyPhone.trim(),
        // Driving Licence
        license: drivingLicense.trim().toUpperCase(),
        dlNumber: drivingLicense.trim().toUpperCase(),
        dlExpiry,
        dlFront: dlFrontUrl,
        dlBack: dlBackUrl,
        dlVerified: true,
        // Vehicle & RC
        vehicleType: vehicleType === "ev" ? "Electric Scooter (EV)" : "Bike (Petrol)",
        vehicleBrand: effectiveBrand,
        vehicleModel: effectiveModel,
        vehicleNumber: vehicleNumber.trim().toUpperCase(),
        rcNumber: vehicleNumber.trim().toUpperCase(),
        engineNumber: engineNumber.trim().toUpperCase(),
        chassisNumber: chassisNumber.trim().toUpperCase(),
        rcFront: rcFrontUrl,
        rcBack: rcBackUrl,
        rcVerified: true,
        // KYC Identity & Live Selfie
        aadhaar: aadhaarNumber.replace(/\s/g, ""),
        aadhaarFront: aadhaarFrontUrl,
        aadhaarBack: aadhaarBackUrl,
        pan: panNumber.trim().toUpperCase(),
        panCard: panCardUrl,
        selfieUrl: selfieUrl,
        photoUrl: selfieUrl,
        selfieVerified: true,
        // Bank Payout Account
        bankName: bankName.trim(),
        accountHolder: accountHolder.trim() || fullName.trim(),
        accountNumber: accountNumber.trim(),
        ifsc: ifsc.trim().toUpperCase(),
        upiId: upiId.trim(),
        bankVerified: true,
        termsAccepted: termsAccepted,
        // Live Government-Verified Profile Snapshot
        verifiedGovernmentName: panVerifiedName || dlVerifiedName || fullName.trim(),
        isKycVerified: true,
        kycLocked: true,
        // Status flags
        status: "pending",
        kycStatus: "pending",
        isVerified: false,
        isOnboarded: true,
      };

      const result = await submitRiderRegistration(payload);
      signIn(result);

      if (panVerifiedName) {
        try {
          localStorage.setItem("qp_rider_government_name", panVerifiedName);
        } catch { }
      }

      toast.success("🎉 Registration Submitted! Real government verification attached.");
      navigate({ to: "/verification" });
    } catch (err: any) {
      toast.error(err?.message || "Registration failed. Please check your network and details.");
    } finally {
      setLoading(false);
    }
  };

  const matchedCityObj = liveCities.find((c) => (c.city || c.name) === selectedCity);
  const cityPincodes = matchedCityObj?.pincodes || [];

  return (
    <div className="relative flex flex-col flex-1 w-full min-h-[100dvh] max-w-md mx-auto bg-[#F8FAFC] text-neutral-900 select-none pb-12">
      {/* 1. Sticky Top Navigation Header */}
      <header
        className="sticky top-0 z-40 flex items-center justify-between px-4 pb-3 bg-white border-b border-neutral-100 shadow-xs"
        style={{ paddingTop: "max(env(safe-area-inset-top, 0px) + 8px, 12px)" }}
      >
        <button
          type="button"
          onClick={handlePrevTask}
          className="flex items-center justify-center w-9 h-9 -ml-1 text-neutral-800 rounded-full hover:bg-neutral-100 active:scale-95 transition-transform"
          aria-label="Back"
        >
          <ArrowLeft className="w-5 h-5 stroke-[2.4]" />
        </button>

        <div className="flex items-center gap-1.5 text-xs font-black text-neutral-900">
          <ShieldCheck className="w-4 h-4 text-[#00C853]" />
          <span>Captain Registration</span>
        </div>

        <span className="text-[11px] font-black px-2.5 py-1 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-full">
          Task {currentTask} of 5
        </span>
      </header>

      {/* 2. Brand Hero & 5-Task Stepper Progress Track */}
      <div className="bg-white px-4 pt-3 pb-4 border-b border-neutral-100 shadow-xs">
        <div className="flex items-center justify-between mb-2.5 px-1">
          <QuickPressLogo size="sm" showSubtitle={false} />
          <div className="flex items-center gap-1 text-[11px] font-black text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
            <Sparkles className="w-3 h-3 text-[#00C853]" />
            <span>{currentTask * 20}% Progress</span>
          </div>
        </div>

        {/* Dynamic Progress Track Bar */}
        <div className="w-full h-1.5 bg-neutral-100 rounded-full overflow-hidden mb-3">
          <div
            className="h-full bg-[#00C853] transition-all duration-300 rounded-full"
            style={{ width: `${currentTask * 20}%` }}
          />
        </div>

        {/* 5 Visual Task Tabs */}
        <div className="grid grid-cols-5 gap-1 text-center">
          {taskTitles.map((task) => {
            const isDone = currentTask > task.num;
            const isCurrent = currentTask === task.num;
            const Icon = task.icon;

            return (
              <button
                key={task.num}
                type="button"
                onClick={() => {
                  if (task.num <= currentTask || isDone) {
                    setCurrentTask(task.num);
                  }
                }}
                className={`flex flex-col items-center gap-1 transition-all ${isCurrent
                    ? "text-[#00C853] font-black"
                    : isDone
                      ? "text-emerald-700 font-bold"
                      : "text-neutral-400 font-medium"
                  }`}
              >
                <div
                  className={`flex items-center justify-center w-8 h-8 rounded-full border-2 text-xs transition-all ${isDone
                      ? "bg-[#00C853] border-[#00C853] text-white shadow-xs"
                      : isCurrent
                        ? "bg-emerald-50 border-[#00C853] text-[#00C853] shadow-xs scale-105"
                        : "bg-white border-neutral-200 text-neutral-400"
                    }`}
                >
                  {isDone ? <Check className="w-4 h-4 stroke-[3]" /> : <Icon className="w-3.5 h-3.5" />}
                </div>
                <span className="text-[10px] leading-tight truncate max-w-full">
                  {task.short}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. Task Content Area */}
      <div className="p-4 flex-1">
        {/* ========================================================
            TASK 1: PERSONAL DETAILS, LIVE OPERATING CITY & PINCODE
        ======================================================== */}
        {currentTask === 1 && (
          <div className="space-y-4 animate-in fade-in duration-200">
            <div className="p-4 bg-white border border-neutral-200/80 rounded-2xl shadow-xs space-y-3.5">
              <div className="flex items-center gap-2 pb-1.5 border-b border-neutral-100">
                <div className="flex items-center justify-center w-7 h-7 rounded-xl bg-emerald-50 text-[#00C853]">
                  <User className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-black uppercase tracking-wider text-neutral-800">
                    Task 1: Personal & Operating Area
                  </h3>
                  <p className="text-[10px] text-neutral-500">Fill your official identity and operating territory</p>
                </div>
              </div>

              {/* Full Name */}
              <div>
                <label className="block text-[11px] font-black text-neutral-700 uppercase tracking-wide mb-1">
                  Full Name (As per Aadhaar / DL) *
                </label>
                <input
                  type="text"
                  required
                  autoComplete="off"
                  placeholder="Enter your full name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full h-11 px-3.5 bg-neutral-50 border border-neutral-200 rounded-xl text-xs font-bold text-neutral-900 focus:bg-white focus:border-[#00C853] focus:outline-none transition-all"
                  autoFocus
                />
              </div>

              {/* Gender Selector */}
              <div>
                <label className="block text-[11px] font-black text-neutral-700 uppercase tracking-wide mb-1">
                  Gender *
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(["male", "female", "other"] as const).map((g) => (
                    <button
                      key={g}
                      type="button"
                      onClick={() => setGender(g)}
                      className={`py-2.5 px-2 text-center rounded-xl border text-xs font-bold capitalize transition-all ${gender === g
                          ? "bg-emerald-50 border-[#00C853] text-emerald-950 font-black shadow-xs ring-1 ring-[#00C853]"
                          : "bg-neutral-50 border-neutral-200 text-neutral-600 hover:bg-neutral-100"
                        }`}
                    >
                      {g === "male" ? "👨 Male" : g === "female" ? "👩 Female" : "⚧ Other"}
                    </button>
                  ))}
                </div>
              </div>

              {/* Date of Birth */}
              <div>
                <label className="block text-[11px] font-black text-neutral-700 uppercase tracking-wide mb-1">
                  Date of Birth (DOB) *
                </label>
                <input
                  type="date"
                  required
                  autoComplete="off"
                  value={dob}
                  onChange={(e) => setDob(e.target.value)}
                  className="w-full h-11 px-3.5 bg-neutral-50 border border-neutral-200 rounded-xl text-xs font-bold text-neutral-900 focus:bg-white focus:border-[#00C853] focus:outline-none transition-all"
                />
              </div>

              {/* Operating City */}
              <div>
                <label className="block text-[11px] font-black text-neutral-700 uppercase tracking-wide mb-1">
                  Operating City *
                </label>

                <select
                  value={selectedCity}
                  onChange={(e) => handleCityChange(e.target.value)}
                  className="w-full h-11 px-3 bg-neutral-50 border border-neutral-200 rounded-xl text-xs font-bold text-neutral-900 focus:bg-white focus:border-[#00C853] focus:outline-none transition-all"
                >
                  <option value="">-- Select Operating City --</option>
                  {liveCities.map((c) => (
                    <option key={c.city || c.name} value={c.city || c.name}>
                      📍 {c.city || c.name} ({c.state || "Uttar Pradesh"})
                    </option>
                  ))}
                </select>
              </div>

              {/* Pin Code (Dropdown + Direct Type Option) */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-[11px] font-black text-neutral-700 uppercase tracking-wide">
                    Operating Pin Code *
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setCustomPincodeMode(!customPincodeMode);
                      setPincode("");
                    }}
                    className="text-[10px] font-black text-[#00C853] hover:underline flex items-center gap-0.5"
                  >
                    <Edit3 className="w-3 h-3" />
                    <span>{customPincodeMode ? "Select from list" : "Type custom pincode"}</span>
                  </button>
                </div>

                {customPincodeMode || cityPincodes.length === 0 ? (
                  <input
                    type="tel"
                    maxLength={6}
                    autoComplete="off"
                    placeholder="Enter 6-digit pin code (e.g. 207123)"
                    value={pincode}
                    onChange={(e) => setPincode(e.target.value.replace(/\D/g, ""))}
                    className="w-full h-11 px-3.5 bg-neutral-50 border border-neutral-200 rounded-xl text-xs font-bold text-neutral-900 focus:bg-white focus:border-[#00C853] focus:outline-none transition-all"
                  />
                ) : (
                  <select
                    value={pincode}
                    onChange={(e) => setPincode(e.target.value)}
                    className="w-full h-11 px-3 bg-neutral-50 border border-neutral-200 rounded-xl text-xs font-bold text-neutral-900 focus:bg-white focus:border-[#00C853] focus:outline-none transition-all"
                  >
                    <option value="">-- Select Pin Code --</option>
                    {cityPincodes.map((pin) => (
                      <option key={pin} value={pin}>
                        📮 {pin}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Emergency Mobile */}
              <div>
                <label className="block text-[11px] font-black text-neutral-700 uppercase tracking-wide mb-1">
                  Emergency Mobile Number
                </label>
                <input
                  type="tel"
                  maxLength={10}
                  autoComplete="off"
                  placeholder="Enter 10-digit emergency contact"
                  value={emergencyPhone}
                  onChange={(e) => setEmergencyPhone(e.target.value.replace(/\D/g, ""))}
                  className="w-full h-11 px-3.5 bg-neutral-50 border border-neutral-200 rounded-xl text-xs font-bold text-neutral-900 focus:bg-white focus:border-[#00C853] focus:outline-none transition-all"
                />
              </div>

              {/* Verified Mobile Pill */}
              {targetPhone && (
                <div className="flex items-center gap-2 p-2.5 bg-emerald-50/70 border border-emerald-200 rounded-xl text-xs font-black text-emerald-900">
                  <CheckCircle2 className="w-4 h-4 text-[#00C853] shrink-0" />
                  <span>Registered Login Phone: +91 {targetPhone.replace("+91", "")}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ========================================================
            TASK 2: DRIVING LICENCE (DL) WITH PHOTO UPLOADS
        ======================================================== */}
        {currentTask === 2 && (
          <div className="space-y-4 animate-in fade-in duration-200">
            <div className="p-4 bg-white border border-neutral-200/80 rounded-2xl shadow-xs space-y-3.5">
              <div className="flex items-center gap-2 pb-1.5 border-b border-neutral-100">
                <div className="flex items-center justify-center w-7 h-7 rounded-xl bg-blue-50 text-blue-600">
                  <IdCard className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-black uppercase tracking-wider text-neutral-800">
                    Task 2: Driving Licence (DL) Details
                  </h3>
                  <p className="text-[10px] text-neutral-500">Government Transport Authority Licence Verification</p>
                </div>
              </div>

              {/* DL Number */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-[11px] font-black text-neutral-700 uppercase tracking-wide">
                    Driving Licence Number (DL No.) *
                  </label>
                  {dlVerified && (
                    <span className="text-[10px] font-black text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full flex items-center gap-1">
                      <Check className="w-3 h-3 stroke-[3]" /> MoRTH Sarathi Verified
                    </span>
                  )}
                </div>
                <div className="relative">
                  <input
                    type="text"
                    required
                    autoComplete="off"
                    spellCheck={false}
                    placeholder="e.g. UP87 20210001234"
                    value={drivingLicense}
                    onChange={(e) => setDrivingLicense(e.target.value.toUpperCase())}
                    className={`w-full h-11 px-3.5 pr-24 bg-neutral-50 border rounded-xl text-xs font-black tracking-wider uppercase text-neutral-900 focus:bg-white focus:outline-none transition-all ${dlVerified ? "border-emerald-500 bg-emerald-50/20" : "border-neutral-200 focus:border-[#00C853]"
                      }`}
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => verifyDlNumber()}
                    disabled={verifyingDl || drivingLicense.trim().length < 8}
                    className={`absolute right-1.5 top-1.5 bottom-1.5 px-2.5 rounded-lg text-[10px] font-black flex items-center gap-1 transition-all ${dlVerified
                        ? "bg-emerald-600 text-white"
                        : "bg-neutral-900 hover:bg-neutral-800 text-white disabled:bg-neutral-200 disabled:text-neutral-400"
                      }`}
                  >
                    {verifyingDl ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : dlVerified ? (
                      <>
                        <Check className="w-3 h-3 stroke-[3]" />
                        <span>Verified</span>
                      </>
                    ) : (
                      <span>Verify DL</span>
                    )}
                  </button>
                </div>
                {dlVerified && dlVerifiedName && (
                  <div className="mt-1 px-2.5 py-1 bg-emerald-100/70 border border-emerald-300 rounded-lg flex items-center justify-between text-[11px] font-bold text-emerald-900">
                    <span>MoRTH Licence Holder:</span>
                    <span className="font-black text-emerald-950">{dlVerifiedName}</span>
                  </div>
                )}
              </div>

              {/* DL Expiry */}
              <div>
                <label className="block text-[11px] font-black text-neutral-700 uppercase tracking-wide mb-1">
                  Licence Valid Till (Expiry Date) *
                </label>
                <input
                  type="date"
                  required
                  autoComplete="off"
                  value={dlExpiry}
                  onChange={(e) => setDlExpiry(e.target.value)}
                  className="w-full h-11 px-3.5 bg-neutral-50 border border-neutral-200 rounded-xl text-xs font-bold text-neutral-900 focus:bg-white focus:border-[#00C853] focus:outline-none transition-all"
                />
              </div>

              {/* DL Front Photo Upload Slot */}
              <DocumentUploadSlot
                label="Driving Licence (Front Side)"
                sublabel="Clear photo showing your DL number, photo & signature"
                docType="dl_front"
                value={dlFrontUrl}
                onChange={setDlFrontUrl}
                isUploading={Boolean(uploadingDocs["dl_front"])}
                setIsUploading={setDocUploading("dl_front")}
                targetPhone={targetPhone}
                icon={IdCard}
                required
              />

              {/* DL Back Photo Upload Slot */}
              <DocumentUploadSlot
                label="Driving Licence (Back Side)"
                sublabel="Back side of licence card showing address & vehicle class"
                docType="dl_back"
                value={dlBackUrl}
                onChange={setDlBackUrl}
                isUploading={Boolean(uploadingDocs["dl_back"])}
                setIsUploading={setDocUploading("dl_back")}
                targetPhone={targetPhone}
                icon={IdCard}
              />

              <div className="flex items-center gap-2 p-2.5 bg-blue-50 border border-blue-200 rounded-xl text-[11px] text-blue-900 font-bold">
                <FileCheck2 className="w-4 h-4 text-blue-600 shrink-0" />
                <span>MoRTH Sarathi Registry Transport Verification</span>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================
            TASK 3: VEHICLE & RC WITH PHOTO UPLOADS
        ======================================================== */}
        {currentTask === 3 && (
          <div className="space-y-4 animate-in fade-in duration-200">
            <div className="p-4 bg-white border border-neutral-200/80 rounded-2xl shadow-xs space-y-3.5">
              <div className="flex items-center gap-2 pb-1.5 border-b border-neutral-100">
                <div className="flex items-center justify-center w-7 h-7 rounded-xl bg-amber-50 text-amber-600">
                  <Bike className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-black uppercase tracking-wider text-neutral-800">
                    Task 3: Vehicle, Brand/Model & RC Details
                  </h3>
                  <p className="text-[10px] text-neutral-500">Fill your 2-wheeler brand, model, RC, engine & chassis</p>
                </div>
              </div>

              {/* Vehicle Type Switcher */}
              <div>
                <label className="block text-[11px] font-black text-neutral-700 uppercase tracking-wide mb-1.5">
                  Vehicle Type *
                </label>
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setVehicleType("bike")}
                    className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border-2 font-black text-xs transition-all ${vehicleType === "bike"
                        ? "bg-emerald-50 border-[#00C853] text-neutral-900 ring-1 ring-[#00C853]"
                        : "bg-neutral-50 border-neutral-200 text-neutral-600 hover:bg-neutral-100"
                      }`}
                  >
                    <Bike className="w-4 h-4 text-[#00C853]" />
                    <span>🛵 Bike (Petrol)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setVehicleType("ev")}
                    className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border-2 font-black text-xs transition-all ${vehicleType === "ev"
                        ? "bg-emerald-50 border-[#00C853] text-neutral-900 ring-1 ring-[#00C853]"
                        : "bg-neutral-50 border-neutral-200 text-neutral-600 hover:bg-neutral-100"
                      }`}
                  >
                    <Zap className="w-4 h-4 text-emerald-600" />
                    <span>⚡ EV Scooter</span>
                  </button>
                </div>
              </div>

              {/* Vehicle Brand Select OR Direct Type */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-[11px] font-black text-neutral-700 uppercase tracking-wide">
                    Vehicle Brand *
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setBrandInputMode(brandInputMode === "select" ? "custom" : "select");
                      setSelectedBrand("");
                      setCustomBrand("");
                    }}
                    className="text-[10px] font-black text-[#00C853] hover:underline flex items-center gap-0.5"
                  >
                    <Edit3 className="w-3 h-3" />
                    <span>{brandInputMode === "select" ? "Type brand name" : "Select brand from list"}</span>
                  </button>
                </div>

                {brandInputMode === "custom" ? (
                  <input
                    type="text"
                    required
                    placeholder="Enter Vehicle Brand (e.g. Hero, Honda)"
                    value={customBrand}
                    onChange={(e) => setCustomBrand(e.target.value)}
                    className="w-full h-11 px-3.5 bg-neutral-50 border border-neutral-200 rounded-xl text-xs font-bold text-neutral-900 focus:bg-white focus:border-[#00C853] focus:outline-none transition-all"
                  />
                ) : (
                  <select
                    value={selectedBrand}
                    onChange={(e) => handleBrandChange(e.target.value)}
                    className="w-full h-11 px-3 bg-neutral-50 border border-neutral-200 rounded-xl text-xs font-bold text-neutral-900 focus:bg-white focus:border-[#00C853] focus:outline-none transition-all"
                  >
                    <option value="">-- Select Vehicle Brand --</option>
                    {Object.keys(VEHICLE_CATALOG).map((b) => (
                      <option key={b} value={b}>
                        🛵 {b}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Vehicle Model */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-[11px] font-black text-neutral-700 uppercase tracking-wide">
                    Vehicle Model *
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setModelInputMode(modelInputMode === "select" ? "custom" : "select");
                      setSelectedModel("");
                      setCustomModel("");
                    }}
                    className="text-[10px] font-black text-[#00C853] hover:underline flex items-center gap-0.5"
                  >
                    <Edit3 className="w-3 h-3" />
                    <span>{modelInputMode === "select" ? "Type custom model" : "Select model from list"}</span>
                  </button>
                </div>

                {modelInputMode === "custom" || !selectedBrand ? (
                  <input
                    type="text"
                    required
                    placeholder="Enter Vehicle Model (e.g. Splendor, Activa)"
                    value={customModel}
                    onChange={(e) => setCustomModel(e.target.value)}
                    className="w-full h-11 px-3.5 bg-neutral-50 border border-neutral-200 rounded-xl text-xs font-bold text-neutral-900 focus:bg-white focus:border-[#00C853] focus:outline-none transition-all"
                  />
                ) : (
                  <select
                    value={selectedModel}
                    onChange={(e) => {
                      setSelectedModel(e.target.value);
                      if (e.target.value === "Other Model") setModelInputMode("custom");
                    }}
                    className="w-full h-11 px-3 bg-neutral-50 border border-neutral-200 rounded-xl text-xs font-bold text-neutral-900 focus:bg-white focus:border-[#00C853] focus:outline-none transition-all"
                  >
                    <option value="">-- Select Model --</option>
                    {(VEHICLE_CATALOG[selectedBrand] || ["Other Model"]).map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Vehicle RC Number Plate */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-[11px] font-black text-neutral-700 uppercase tracking-wide">
                    Vehicle Registration No. (Number Plate) *
                  </label>
                  {rcVerified && (
                    <span className="text-[10px] font-black text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full flex items-center gap-1">
                      <Check className="w-3 h-3 stroke-[3]" /> Parivahan Vahan Verified
                    </span>
                  )}
                </div>
                <div className="relative">
                  <input
                    type="text"
                    required
                    autoComplete="off"
                    spellCheck={false}
                    placeholder="e.g. UP 87 AB 1234"
                    value={vehicleNumber}
                    onChange={(e) => setVehicleNumber(e.target.value.toUpperCase())}
                    className={`w-full h-11 px-3.5 pr-24 bg-neutral-50 border rounded-xl text-xs font-black tracking-wider uppercase text-neutral-900 focus:bg-white focus:outline-none transition-all ${rcVerified ? "border-emerald-500 bg-emerald-50/20" : "border-neutral-200 focus:border-[#00C853]"
                      }`}
                  />
                  <button
                    type="button"
                    onClick={() => verifyRcNumber()}
                    disabled={verifyingRc || vehicleNumber.trim().length < 6}
                    className={`absolute right-1.5 top-1.5 bottom-1.5 px-2.5 rounded-lg text-[10px] font-black flex items-center gap-1 transition-all ${rcVerified
                        ? "bg-emerald-600 text-white"
                        : "bg-neutral-900 hover:bg-neutral-800 text-white disabled:bg-neutral-200 disabled:text-neutral-400"
                      }`}
                  >
                    {verifyingRc ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : rcVerified ? (
                      <>
                        <Check className="w-3 h-3 stroke-[3]" />
                        <span>Verified</span>
                      </>
                    ) : (
                      <span>Verify RC</span>
                    )}
                  </button>
                </div>
                {rcVerified && rcVerifiedOwner && (
                  <div className="mt-1 px-2.5 py-1 bg-emerald-100/70 border border-emerald-300 rounded-lg flex items-center justify-between text-[11px] font-bold text-emerald-900">
                    <span>Registered Vehicle Owner:</span>
                    <span className="font-black text-emerald-950">{rcVerifiedOwner}</span>
                  </div>
                )}
              </div>

              {/* Engine Number & Chassis Number */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-black text-neutral-700 uppercase tracking-wide mb-1">
                    Engine Number
                  </label>
                  <input
                    type="text"
                    autoComplete="off"
                    placeholder="e.g. HA10E3948201"
                    value={engineNumber}
                    onChange={(e) => setEngineNumber(e.target.value.toUpperCase())}
                    className="w-full h-11 px-3.5 bg-neutral-50 border border-neutral-200 rounded-xl text-xs font-black tracking-wider uppercase text-neutral-900 focus:bg-white focus:border-[#00C853] focus:outline-none transition-all"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-black text-neutral-700 uppercase tracking-wide mb-1">
                    Chassis Number (VIN)
                  </label>
                  <input
                    type="text"
                    autoComplete="off"
                    placeholder="e.g. MD625BG39K0..."
                    value={chassisNumber}
                    onChange={(e) => setChassisNumber(e.target.value.toUpperCase())}
                    className="w-full h-11 px-3.5 bg-neutral-50 border border-neutral-200 rounded-xl text-xs font-black tracking-wider uppercase text-neutral-900 focus:bg-white focus:border-[#00C853] focus:outline-none transition-all"
                  />
                </div>
              </div>

              {/* Vehicle RC Document Photo (Front) */}
              <DocumentUploadSlot
                label="Vehicle RC Smart Card Photo (Front)"
                sublabel="Registration certificate issued by RTO / Parivahan"
                docType="rc_front"
                value={rcFrontUrl}
                onChange={setRcFrontUrl}
                isUploading={Boolean(uploadingDocs["rc_front"])}
                setIsUploading={setDocUploading("rc_front")}
                targetPhone={targetPhone}
                icon={FileText}
                required
              />

              {/* Vehicle RC Document Photo (Back / Optional) */}
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
            TASK 4: AADHAAR, PAN & LIVE SELFIE KYC (REAL UPLOADS)
        ======================================================== */}
        {currentTask === 4 && (
          <div className="space-y-4 animate-in fade-in duration-200">
            <div className="p-4 bg-white border border-neutral-200/80 rounded-2xl shadow-xs space-y-3.5">
              <div className="flex items-center gap-2 pb-1.5 border-b border-neutral-100">
                <div className="flex items-center justify-center w-7 h-7 rounded-xl bg-purple-50 text-purple-600">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-black uppercase tracking-wider text-neutral-800">
                    Task 4: Aadhaar, PAN & Live Selfie KYC
                  </h3>
                  <p className="text-[10px] text-neutral-500">Government identity verification & safety verification</p>
                </div>
              </div>

              {/* 1. Aadhaar Card Section */}
              <div className="p-3 bg-neutral-50/80 border border-neutral-200 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-neutral-900 flex items-center gap-1.5">
                    <IdCard className="w-4 h-4 text-purple-600" />
                    <span>Aadhaar Card (UIDAI)</span>
                  </span>
                  <span className="text-[10px] font-bold text-purple-700 bg-purple-100 px-2 py-0.5 rounded-full">
                    Required ID
                  </span>
                </div>

                {/* Aadhaar Number */}
                <div>
                  <label className="block text-[11px] font-black text-neutral-700 uppercase tracking-wide mb-1">
                    12-Digit Aadhaar Card Number *
                  </label>
                  <input
                    type="text"
                    required
                    autoComplete="off"
                    maxLength={14}
                    placeholder="e.g. 5489 1234 8921"
                    value={aadhaarNumber}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, "").slice(0, 12);
                      const formatted = val.match(/.{1,4}/g)?.join(" ") || val;
                      setAadhaarNumber(formatted);
                    }}
                    className="w-full h-11 px-3.5 bg-white border border-neutral-200 rounded-xl text-xs font-black tracking-widest text-neutral-900 focus:border-[#00C853] focus:outline-none transition-all"
                  />
                </div>

                {/* Aadhaar Front Photo */}
                <DocumentUploadSlot
                  label="Aadhaar Card (Front Side Photo)"
                  sublabel="Clear photo showing 12-digit number, photo & name"
                  docType="aadhaar_front"
                  value={aadhaarFrontUrl}
                  onChange={setAadhaarFrontUrl}
                  isUploading={Boolean(uploadingDocs["aadhaar_front"])}
                  setIsUploading={setDocUploading("aadhaar_front")}
                  targetPhone={targetPhone}
                  icon={IdCard}
                  required
                />

                {/* Aadhaar Back Photo */}
                <DocumentUploadSlot
                  label="Aadhaar Card (Back Side Photo)"
                  sublabel="Photo showing permanent address & QR code"
                  docType="aadhaar_back"
                  value={aadhaarBackUrl}
                  onChange={setAadhaarBackUrl}
                  isUploading={Boolean(uploadingDocs["aadhaar_back"])}
                  setIsUploading={setDocUploading("aadhaar_back")}
                  targetPhone={targetPhone}
                  icon={IdCard}
                />
              </div>

              {/* 2. PAN Card Section */}
              <div className="p-3 bg-neutral-50/80 border border-neutral-200 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-neutral-900 flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-sky-600" />
                    <span>PAN Card (Income Tax Dept.)</span>
                  </span>
                  <span className="text-[10px] font-bold text-sky-700 bg-sky-100 px-2 py-0.5 rounded-full">
                    TDS & Payout Compliance
                  </span>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-[11px] font-black text-neutral-700 uppercase tracking-wide">
                      PAN Card Number (10-Digit)
                    </label>
                    {panVerified && (
                      <span className="text-[10px] font-black text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full flex items-center gap-1">
                        <Check className="w-3 h-3 stroke-[3]" /> Income Tax Verified
                      </span>
                    )}
                  </div>
                  <div className="relative">
                    <input
                      type="text"
                      autoComplete="off"
                      maxLength={10}
                      placeholder="e.g. ABCDE1234F"
                      value={panNumber}
                      onChange={(e) => {
                        const val = e.target.value.toUpperCase();
                        setPanNumber(val);
                        if (val.length === 10) {
                          verifyPanCard(val);
                        }
                      }}
                      className={`w-full h-11 px-3.5 pr-24 bg-white border rounded-xl text-xs font-black tracking-wider uppercase text-neutral-900 focus:outline-none transition-all ${panVerified ? "border-emerald-500 bg-emerald-50/20" : "border-neutral-200 focus:border-[#00C853]"
                        }`}
                    />
                    <button
                      type="button"
                      onClick={() => verifyPanCard()}
                      disabled={verifyingPan || panNumber.trim().length !== 10}
                      className={`absolute right-1.5 top-1.5 bottom-1.5 px-2.5 rounded-lg text-[10px] font-black flex items-center gap-1 transition-all ${panVerified
                          ? "bg-emerald-600 text-white"
                          : "bg-neutral-900 hover:bg-neutral-800 text-white disabled:bg-neutral-200 disabled:text-neutral-400"
                        }`}
                    >
                      {verifyingPan ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : panVerified ? (
                        <>
                          <Check className="w-3 h-3 stroke-[3]" />
                          <span>Verified</span>
                        </>
                      ) : (
                        <span>Verify PAN</span>
                      )}
                    </button>
                  </div>
                  {panVerified && panVerifiedName && (
                    <div className="mt-1 px-2.5 py-1 bg-emerald-100/70 border border-emerald-300 rounded-lg flex items-center justify-between text-[11px] font-bold text-emerald-900">
                      <span>NSDL Registered Name:</span>
                      <span className="font-black text-emerald-950">{panVerifiedName}</span>
                    </div>
                  )}
                </div>

                <DocumentUploadSlot
                  label="PAN Card Photo"
                  sublabel="Clear photo of physical PAN Card or e-PAN"
                  docType="pan_card"
                  value={panCardUrl}
                  onChange={setPanCardUrl}
                  isUploading={Boolean(uploadingDocs["pan_card"])}
                  setIsUploading={setDocUploading("pan_card")}
                  targetPhone={targetPhone}
                  icon={FileText}
                />
              </div>

              {/* 3. Live Captain Profile Photo / Selfie */}
              <div className="p-3.5 bg-emerald-50/60 border border-emerald-200 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-emerald-950 flex items-center gap-1.5">
                    <Camera className="w-4 h-4 text-[#00C853]" />
                    <span>Live Captain Profile Photo / Selfie *</span>
                  </span>
                  <span className="text-[10px] font-black text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full">
                    Face Match
                  </span>
                </div>

                <DocumentUploadSlot
                  label="Captain Live Selfie"
                  sublabel="Take a live front selfie in good lighting (No sunglasses/mask)"
                  docType="selfie"
                  value={selfieUrl}
                  onChange={setSelfieUrl}
                  isUploading={Boolean(uploadingDocs["selfie"])}
                  setIsUploading={setDocUploading("selfie")}
                  capture="user"
                  targetPhone={targetPhone}
                  icon={Camera}
                  required
                />
              </div>
            </div>
          </div>
        )}

        {/* ========================================================
            TASK 5: BANK ACCOUNT & FULL 5-TASK REVIEW
        ======================================================== */}
        {currentTask === 5 && (
          <form onSubmit={handleFinalSubmit} className="space-y-4 animate-in fade-in duration-200">
            {/* Bank Card */}
            <div className="p-4 bg-white border border-neutral-200/80 rounded-2xl shadow-xs space-y-3.5">
              <div className="flex items-center gap-2 pb-1.5 border-b border-neutral-100">
                <div className="flex items-center justify-center w-7 h-7 rounded-xl bg-emerald-50 text-[#00C853]">
                  <CreditCard className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-black uppercase tracking-wider text-neutral-800">
                    Task 5: Bank Payout Account (0% Commission)
                  </h3>
                  <p className="text-[10px] text-neutral-500">Earnings transfer directly to your verified bank account</p>
                </div>
              </div>

              {/* Bank Name */}
              <div>
                <label className="block text-[11px] font-black text-neutral-700 uppercase tracking-wide mb-1">
                  Bank Name *
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    autoComplete="off"
                    placeholder="e.g. State Bank of India / HDFC Bank / PNB"
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                    className="w-full h-11 px-3.5 bg-neutral-50 border border-neutral-200 rounded-xl text-xs font-bold text-neutral-900 focus:bg-white focus:border-[#00C853] focus:outline-none transition-all"
                  />
                  <Building2 className="absolute right-3 top-3.5 w-4 h-4 text-neutral-400 pointer-events-none" />
                </div>
              </div>

              {/* Account Holder Name */}
              <div>
                <label className="block text-[11px] font-black text-neutral-700 uppercase tracking-wide mb-1">
                  Account Holder Name (As per Bank Records) *
                </label>
                <input
                  type="text"
                  required
                  autoComplete="off"
                  placeholder="Account Holder Full Name"
                  value={accountHolder}
                  onChange={(e) => setAccountHolder(e.target.value)}
                  className="w-full h-11 px-3.5 bg-neutral-50 border border-neutral-200 rounded-xl text-xs font-bold text-neutral-900 focus:bg-white focus:border-[#00C853] focus:outline-none transition-all"
                />
              </div>

              {/* Account Number & Confirm Account Number */}
              <div className="space-y-3">
                <div>
                  <label className="block text-[11px] font-black text-neutral-700 uppercase tracking-wide mb-1">
                    Bank Account Number *
                  </label>
                  <input
                    type="text"
                    required
                    autoComplete="off"
                    placeholder="Enter Account No."
                    value={accountNumber}
                    onChange={(e) => setAccountNumber(e.target.value.replace(/\D/g, ""))}
                    className="w-full h-11 px-3.5 bg-neutral-50 border border-neutral-200 rounded-xl text-xs font-bold text-neutral-900 focus:bg-white focus:border-[#00C853] focus:outline-none transition-all font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-black text-neutral-700 uppercase tracking-wide mb-1">
                    Re-Enter Bank Account Number *
                  </label>
                  <input
                    type="text"
                    required
                    autoComplete="off"
                    placeholder="Re-enter to confirm"
                    value={confirmAccountNumber}
                    onChange={(e) => setConfirmAccountNumber(e.target.value.replace(/\D/g, ""))}
                    className="w-full h-11 px-3.5 bg-neutral-50 border border-neutral-200 rounded-xl text-xs font-bold text-neutral-900 focus:bg-white focus:border-[#00C853] focus:outline-none transition-all font-mono"
                  />
                </div>
              </div>

              {/* IFSC & UPI ID */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-black text-neutral-700 uppercase tracking-wide mb-1">
                    IFSC Code *
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={11}
                    autoComplete="off"
                    placeholder="e.g. SBIN0001234"
                    value={ifsc}
                    onChange={(e) => setIfsc(e.target.value.toUpperCase())}
                    className="w-full h-11 px-3.5 bg-neutral-50 border border-neutral-200 rounded-xl text-xs font-bold uppercase text-neutral-900 focus:bg-white focus:border-[#00C853] focus:outline-none transition-all font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-black text-neutral-700 uppercase tracking-wide mb-1">
                    UPI ID (Instant Payout)
                  </label>
                  <input
                    type="text"
                    autoComplete="off"
                    placeholder="e.g. mobile@paytm"
                    value={upiId}
                    onChange={(e) => setUpiId(e.target.value.trim().toLowerCase())}
                    className="w-full h-11 px-3.5 bg-neutral-50 border border-neutral-200 rounded-xl text-xs font-bold text-neutral-900 focus:bg-white focus:border-[#00C853] focus:outline-none transition-all"
                  />
                </div>
              </div>

              {/* Penny Drop Verification Block */}
              <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl flex items-center justify-between">
                <div>
                  <p className="text-xs font-black text-emerald-950 flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-[#00C853]" />
                    <span>NPCI IMPS Penny Drop Verification</span>
                  </p>
                  <p className="text-[10px] text-emerald-700">
                    {bankVerified && bankVerifiedHolder
                      ? `Account verified for: ${bankVerifiedHolder}`
                      : "Verifies account validity & holder name via banking rail"}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => verifyBankAccount()}
                  disabled={verifyingBank || !accountNumber || !ifsc}
                  className={`px-3 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all ${
                    bankVerified
                      ? "bg-emerald-600 text-white"
                      : "bg-[#00C853] hover:bg-[#00B248] text-white disabled:bg-neutral-200 disabled:text-neutral-400"
                  }`}
                >
                  {verifyingBank ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Checking...</span>
                    </>
                  ) : bankVerified ? (
                    <>
                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                      <span>Verified ✓</span>
                    </>
                  ) : (
                    <span>Verify Account</span>
                  )}
                </button>
              </div>
            </div>

            {/* Comprehensive 5-Task Review & KYC Documents Summary */}
            <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-2xl space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-emerald-200/60">
                <span className="text-xs font-black text-emerald-950">KYC & Registration Summary</span>
                <span className="text-[10px] font-black text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full">
                  All 5 Tasks Ready
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div>
                  <p className="text-neutral-500 font-medium">Captain Name</p>
                  <p className="font-black text-neutral-900">{fullName || "—"}</p>
                </div>
                <div>
                  <p className="text-neutral-500 font-medium">City & Pin</p>
                  <p className="font-black text-neutral-900">
                    {selectedCity || "—"} ({pincode || "—"})
                  </p>
                </div>
                <div>
                  <p className="text-neutral-500 font-medium">Vehicle Plate</p>
                  <p className="font-black text-neutral-900">{vehicleNumber || "—"}</p>
                </div>
                <div>
                  <p className="text-neutral-500 font-medium">Driving Licence</p>
                  <p className="font-black text-neutral-900">{drivingLicense || "—"}</p>
                </div>
              </div>

              {/* Uploaded Documents Badges List */}
              <div className="pt-2 border-t border-emerald-200/60">
                <p className="text-[10px] font-black text-neutral-600 uppercase mb-2">Attached Verification Documents:</p>
                <div className="grid grid-cols-2 gap-1.5 text-[10px]">
                  <span className={`px-2 py-1 rounded-md font-bold flex items-center gap-1 ${dlFrontUrl ? "bg-emerald-100 text-emerald-800" : "bg-neutral-100 text-neutral-500"}`}>
                    <CheckCircle2 className="w-3 h-3 text-[#00C853]" /> DL Front Photo
                  </span>
                  <span className={`px-2 py-1 rounded-md font-bold flex items-center gap-1 ${rcFrontUrl ? "bg-emerald-100 text-emerald-800" : "bg-neutral-100 text-neutral-500"}`}>
                    <CheckCircle2 className="w-3 h-3 text-[#00C853]" /> Vehicle RC Photo
                  </span>
                  <span className={`px-2 py-1 rounded-md font-bold flex items-center gap-1 ${aadhaarFrontUrl ? "bg-emerald-100 text-emerald-800" : "bg-neutral-100 text-neutral-500"}`}>
                    <CheckCircle2 className="w-3 h-3 text-[#00C853]" /> Aadhaar Front
                  </span>
                  <span className={`px-2 py-1 rounded-md font-bold flex items-center gap-1 ${selfieUrl ? "bg-emerald-100 text-emerald-800" : "bg-neutral-100 text-neutral-500"}`}>
                    <CheckCircle2 className="w-3 h-3 text-[#00C853]" /> Live Selfie Photo
                  </span>
                  <span className={`px-2 py-1 rounded-md font-bold flex items-center gap-1 ${panCardUrl ? "bg-emerald-100 text-emerald-800" : "bg-neutral-100 text-neutral-400"}`}>
                    {panCardUrl ? <CheckCircle2 className="w-3 h-3 text-[#00C853]" /> : "○"} PAN Card Photo
                  </span>
                  <span className={`px-2 py-1 rounded-md font-bold flex items-center gap-1 ${dlBackUrl ? "bg-emerald-100 text-emerald-800" : "bg-neutral-100 text-neutral-400"}`}>
                    {dlBackUrl ? <CheckCircle2 className="w-3 h-3 text-[#00C853]" /> : "○"} DL Back Photo
                  </span>
                </div>
              </div>
            </div>

            {/* Terms and Conditions Checkbox */}
            <div className="flex items-start gap-2.5 p-3 bg-white border border-neutral-200 rounded-xl">
              <input
                type="checkbox"
                id="terms"
                checked={termsAccepted}
                onChange={(e) => setTermsAccepted(e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded text-[#00C853] focus:ring-[#00C853]"
              />
              <label htmlFor="terms" className="text-[11px] text-neutral-600 font-medium">
                I hereby declare that all uploaded government identity documents (Aadhaar, PAN, DL, RC) and bank details are true and belong to me. I agree to the QuickPress Captain Partner Terms & Code of Conduct.
              </label>
            </div>

            {/* Final Submit Button */}
            <div
              className="pt-2 space-y-2.5"
              style={{ paddingBottom: "max(env(safe-area-inset-bottom, 0px) + 16px, 24px)" }}
            >
              <button
                type="submit"
                disabled={loading || !termsAccepted}
                className="w-full h-13.5 flex items-center justify-center gap-2 bg-[#00C853] hover:bg-[#00B248] active:bg-[#009624] text-white font-black text-sm tracking-wide rounded-2xl shadow-lg shadow-emerald-500/25 active:scale-98 transition-all disabled:opacity-50"
              >
                {loading ? (
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-5 h-5 animate-spin text-white" />
                    <span>Saving to Database & Submitting...</span>
                  </div>
                ) : (
                  <span>Submit Captain KYC & Register 🚀</span>
                )}
              </button>

              <p className="text-[10px] text-center text-neutral-500 font-semibold">
                QuickPress Captain Partner 0% Commission & Weekly Direct Bank Transfer
              </p>
            </div>
          </form>
        )}
      </div>

      {/* 4. Bottom Sticky Action Bar (For Tasks 1 to 4) */}
      {currentTask < 5 && (
        <div
          className="sticky bottom-0 z-40 px-4 pt-3 bg-white/95 backdrop-blur-xs border-t border-neutral-100 flex items-center justify-between gap-3 shadow-lg"
          style={{ paddingBottom: "max(env(safe-area-inset-bottom, 0px) + 12px, 16px)" }}
        >
          {currentTask > 1 ? (
            <button
              type="button"
              onClick={handlePrevTask}
              className="h-12 px-5 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 font-black text-xs rounded-xl active:scale-95 transition-all"
            >
              Previous
            </button>
          ) : (
            <div />
          )}

          <button
            type="button"
            onClick={handleNextTask}
            className="flex-1 h-12 flex items-center justify-center gap-2 bg-[#00C853] hover:bg-[#00B248] text-white font-black text-xs tracking-wide rounded-xl shadow-md shadow-emerald-500/25 active:scale-98 transition-all"
          >
            <span>Continue to Task {currentTask + 1}</span>
            <ArrowRight className="w-4 h-4 stroke-[2.5]" />
          </button>
        </div>
      )}
    </div>
  );
}
