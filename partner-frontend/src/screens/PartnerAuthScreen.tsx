import { useNavigate } from "@tanstack/react-router";
import {
  AlertCircle,
  ArrowLeft,
  ChevronDown,
  Headphones,
  Loader2,
  MessageSquare,
  Phone,
  ShieldCheck,
  X,
} from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";

import { Toaster } from "@/shared/ui/sonner";
import { usePartnerContext } from "../context/PartnerContext";
import { partnerRoutes } from "../navigation/partner-routes";
import { validateMobile } from "../lib/partner-validation";
import {
  areAllMerchantPermissionsGranted,
  hasCompletedPermissionsOnboarding,
} from "../lib/merchant-device-opt";
import {
  checkPartnerRegistered,
  checkPartnerVerificationStatus,
  loginWithGoogle,
  rememberPartnerLogin,
  requestOtp,
} from "@/api/partner/partner-auth-api";
import { PartnerIntroCarousel } from "../components/auth/PartnerIntroCarousel";

const REMEMBER_KEY = "qp.partner.rememberedPhone";

function GoogleGlyph() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className="size-4.5 shrink-0">
      <path
        fill="#4285F4"
        d="M23.5 12.3c0-.9-.1-1.5-.2-2.2H12v4.1h6.6a5.7 5.7 0 0 1-2.4 3.7v3h3.8c2.3-2.1 3.5-5.2 3.5-8.6Z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.2 0 5.9-1.1 7.9-2.9l-3.8-3c-1.1.7-2.4 1.2-4.1 1.2-3.1 0-5.8-2.1-6.8-5H1.3v3.1A12 12 0 0 0 12 24Z"
      />
      <path
        fill="#FBBC05"
        d="M5.2 14.3a7.2 7.2 0 0 1 0-4.6V6.6H1.3a12 12 0 0 0 0 10.8l3.9-3.1Z"
      />
      <path
        fill="#EA4335"
        d="M12 4.8c1.8 0 3.3.6 4.5 1.8l3.4-3.4A12 12 0 0 0 1.3 6.6l3.9 3.1c1-2.9 3.7-4.9 6.8-4.9Z"
      />
    </svg>
  );
}

export function PartnerAuthScreen() {
  const navigate = useNavigate();
  const { setPhone, signIn, session, hydrating } = usePartnerContext();

  // Auth steps: "intro" (welcome carousel) | "phone" (mobile login)
  const [step, setStep] = useState<"intro" | "phone">("intro");
  const [phoneVal, setPhoneVal] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notRegistered, setNotRegistered] = useState(false);
  const [busy, setBusy] = useState(false);
  const [googleBusy, setGoogleBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);

  // Auto-detect mode from URL params if direct login requested
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("step") === "login" || params.get("mode") === "login") {
        setStep("phone");
      }
    }
  }, []);

  // Redirect if already authenticated
  useEffect(() => {
    if (hydrating || !session) return;
    if (session.isOnboarded === false) {
      navigate({ to: partnerRoutes.registration, replace: true });
    } else if (!session.isVerified) {
      navigate({ to: partnerRoutes.registrationSubmitted, replace: true });
    } else {
      navigate({ to: partnerRoutes.orders, replace: true });
    }
  }, [hydrating, session, navigate]);

  // Restore remembered phone number
  useEffect(() => {
    const saved = window.localStorage.getItem(REMEMBER_KEY);
    if (saved) {
      setPhoneVal(saved);
    }
  }, []);

  const handlePhoneSubmit = async (event?: FormEvent) => {
    event?.preventDefault();
    if (busy || sent) return;

    const message = validateMobile(phoneVal);
    if (message) {
      setError(message);
      toast.error(message);
      return;
    }
    setError(null);
    setNotRegistered(false);
    setBusy(true);

    const digits = phoneVal.replace(/\D/g, "").slice(-10);

    try {
      // 1. Verify partner registration in DB
      const check = await checkPartnerRegistered(digits);

      if (!check.isRegistered || !check.isOnboarded) {
        const notRegMsg =
          "This mobile number is not registered as a Partner Store. Please register your store first.";
        setError(notRegMsg);
        setNotRegistered(true);
        setBusy(false);
        return;
      }

      window.localStorage.setItem(REMEMBER_KEY, digits);
      rememberPartnerLogin(true);

      // 2. Request real OTP via Firebase
      await requestOtp(digits);
      setPhone(digits);
      setSent(true);

      window.setTimeout(() => {
        navigate({ to: partnerRoutes.otp });
      }, 250);
    } catch (cause) {
      const msg =
        cause instanceof Error ? cause.message : "Unable to connect to server. Please try again.";
      setError(msg);
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  };

  const handleGoogle = async () => {
    if (googleBusy) return;
    setGoogleBusy(true);
    try {
      const sess = await loginWithGoogle();
      let realIsOnboarded = sess.isOnboarded;
      let realIsVerified = sess.isVerified;
      try {
        const statusRes = await checkPartnerVerificationStatus();
        if (statusRes) {
          realIsOnboarded = Boolean(statusRes.isOnboarded);
          realIsVerified = Boolean(statusRes.isVerified);
        }
      } catch {}
      const resolved = { ...sess, isOnboarded: realIsOnboarded, isVerified: realIsVerified };
      signIn(resolved);

      if (!realIsOnboarded) {
        navigate({ to: partnerRoutes.registration, replace: true });
      } else if (!realIsVerified) {
        navigate({ to: partnerRoutes.registrationSubmitted, replace: true });
      } else if (hasCompletedPermissionsOnboarding() || areAllMerchantPermissionsGranted()) {
        navigate({ to: partnerRoutes.orders, replace: true });
      } else {
        navigate({ to: partnerRoutes.permissions, replace: true });
      }
    } catch (cause) {
      toast.error(
        cause instanceof Error ? cause.message : "Google Sign In was cancelled or failed",
      );
    } finally {
      setGoogleBusy(false);
    }
  };

  const clearPhone = () => {
    setPhoneVal("");
    setError(null);
    setNotRegistered(false);
  };

  return (
    <div className="min-h-screen bg-white text-zinc-900 font-sans selection:bg-blue-500/20">
      <Toaster richColors position="top-center" />

      {/* ========================================================================= */}
      {/* STEP 1: WELCOME CAROUSEL (FULL SCREEN - MATCHES IMAGE 1 & 2)              */}
      {/* ========================================================================= */}
      {step === "intro" ? (
        <div className="w-full h-full animate-in fade-in duration-300">
          <PartnerIntroCarousel
            onLoginClick={() => setStep("phone")}
            onSignUpClick={() => navigate({ to: partnerRoutes.registration })}
          />
        </div>
      ) : (
        /* ======================================================================= */
        /* STEP 2: PHONE NUMBER LOGIN SCREEN (EMAIL LOGIN REMOVED)                 */
        /* ======================================================================= */
        <div className="min-h-screen flex flex-col justify-between max-w-sm sm:max-w-md mx-auto w-full px-5 py-4 animate-in fade-in duration-200">
          {/* Top Navigation Bar */}
          <div>
            <div className="flex items-center justify-between pt-1">
              <button
                type="button"
                onClick={() => setStep("intro")}
                className="size-9 rounded-full bg-zinc-100 hover:bg-zinc-200 text-zinc-700 flex items-center justify-center transition-all cursor-pointer active:scale-95"
                aria-label="Back to home"
              >
                <ArrowLeft className="size-4" />
              </button>
            </div>

            {/* Brand Header with Exact Logo from Image 2 */}
            <div className="flex flex-col items-center justify-center pt-8 pb-5">
              <img
                src="/quickpress-partner-onboarding-logo.png"
                alt="QuickPress Partner Onboarding"
                className="h-12 w-auto object-contain mx-auto"
              />
            </div>

            {/* Instruction Prompt */}
            <p className="text-center text-sm font-medium text-zinc-600 mb-6 px-4 leading-relaxed">
              {lang === "hi"
                ? "अपना मोबाइल नंबर दर्ज करें, हम जारी रखने के लिए एक OTP भेजेंगे"
                : "Enter your phone number and we will send an OTP to continue"}
            </p>

            {/* Phone Form */}
            <form onSubmit={handlePhoneSubmit} className="space-y-4">
              <div
                className={`flex h-13 items-center rounded-xl border bg-white px-3.5 transition-all shadow-xs ${
                  error
                    ? "border-red-500 ring-2 ring-red-100"
                    : "border-zinc-300 focus-within:border-[#2563eb] focus-within:ring-2 focus-within:ring-blue-100"
                }`}
              >
                {/* Country Code Pill */}
                <div className="flex items-center gap-1.5 pr-3 border-r border-zinc-200 text-zinc-900 font-bold text-sm select-none">
                  <span className="text-base">🇮🇳</span>
                  <span>+91</span>
                  <ChevronDown className="w-3.5 h-3.5 text-zinc-400" />
                </div>

                {/* Phone Input */}
                <input
                  id="partner-phone-input"
                  type="tel"
                  inputMode="numeric"
                  autoComplete="tel-national"
                  maxLength={10}
                  value={phoneVal}
                  onChange={(e) => {
                    setPhoneVal(e.target.value.replace(/\D/g, "").slice(0, 10));
                    if (error) {
                      setError(null);
                      setNotRegistered(false);
                    }
                  }}
                  placeholder={lang === "hi" ? "10 अंकों का मोबाइल नंबर" : "Enter phone number"}
                  className="w-full pl-3 text-base font-semibold text-zinc-950 placeholder:text-zinc-400 placeholder:font-normal outline-none bg-transparent"
                  autoFocus
                />

                {phoneVal.length > 0 && (
                  <button
                    type="button"
                    onClick={clearPhone}
                    className="w-5 h-5 rounded-full bg-zinc-200 text-zinc-600 hover:bg-zinc-300 flex items-center justify-center shrink-0 cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>

              {/* Error / Not Registered Callout */}
              {error && notRegistered ? (
                <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-950 space-y-2 animate-in fade-in duration-200">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <p className="text-xs font-semibold leading-relaxed">{error}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => navigate({ to: partnerRoutes.registration })}
                    className="w-full py-2 px-3 rounded-lg bg-amber-600 text-white font-bold text-xs hover:bg-amber-700 transition-colors shadow-2xs cursor-pointer text-center block"
                  >
                    {lang === "hi" ? "नया पार्टनर स्टोर जोड़ें →" : "Register as New Partner Store →"}
                  </button>
                </div>
              ) : error ? (
                <p className="text-xs font-semibold text-red-600 px-1 animate-in fade-in duration-200">
                  {error}
                </p>
              ) : null}

              {/* Send OTP Button (Grey when disabled, Vibrant Blue when 10 digits) */}
              <button
                type="submit"
                disabled={phoneVal.length !== 10 || busy}
                className={`w-full h-12 rounded-xl font-bold text-sm tracking-wide transition-all flex items-center justify-center gap-2 ${
                  phoneVal.length === 10 && !busy
                    ? "bg-[#2563eb] hover:bg-[#1d4ed8] text-white shadow-sm active:scale-[0.98] cursor-pointer"
                    : "bg-zinc-200 text-zinc-400 cursor-not-allowed"
                }`}
              >
                {busy ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>{lang === "hi" ? "OTP भेजा जा रहा है..." : "Sending OTP..."}</span>
                  </>
                ) : (
                  <span>Send OTP</span>
                )}
              </button>
            </form>

            {/* OR Divider */}
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-zinc-200" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-3 font-semibold tracking-wider text-zinc-400">
                  OR
                </span>
              </div>
            </div>

            {/* Secondary Login Options */}
            <div className="space-y-3">
              <button
                type="button"
                onClick={handleGoogle}
                disabled={googleBusy}
                className="w-full h-12 rounded-xl border border-zinc-300 hover:bg-zinc-50 active:scale-[0.98] transition-all flex items-center justify-center gap-2.5 text-zinc-800 font-semibold text-sm cursor-pointer shadow-2xs"
              >
                {googleBusy ? (
                  <Loader2 className="w-4 h-4 animate-spin text-zinc-600" />
                ) : (
                  <GoogleGlyph />
                )}
                <span>Login with Google</span>
              </button>
            </div>

            {/* Need Help Link */}
            <div className="text-center mt-6">
              <button
                type="button"
                onClick={() => setShowHelpModal(true)}
                className="text-xs font-semibold text-[#2563eb] hover:underline cursor-pointer"
              >
                Need help with login
              </button>
            </div>
          </div>

          {/* Footer Branding */}
          <div className="text-center pt-8 pb-3">
            <p className="text-[11px] text-zinc-400 flex items-center justify-center gap-1.5 font-medium">
              <ShieldCheck className="size-3.5 text-emerald-600" />
              QuickPress Partner Portal · Secure 256-bit Login
            </p>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* QUICK PARTNER SUPPORT MODAL ("Need help with login")                      */}
      {/* ========================================================================= */}
      {showHelpModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-xl space-y-4 animate-in slide-in-from-bottom duration-200">
            <div className="flex items-center justify-between pb-2 border-b border-zinc-100">
              <div className="flex items-center gap-2">
                <Headphones className="size-5 text-[#2563eb]" />
                <h3 className="font-bold text-base text-zinc-950">Partner Support</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowHelpModal(false)}
                className="size-8 rounded-full bg-zinc-100 hover:bg-zinc-200 text-zinc-600 flex items-center justify-center cursor-pointer"
              >
                <X className="size-4" />
              </button>
            </div>

            <p className="text-xs text-zinc-600 leading-relaxed">
              If your phone number has changed or you are facing OTP issues, contact our Merchant Onboarding team directly:
            </p>

            <div className="space-y-2.5 pt-1">
              <a
                href="https://wa.me/919582391824?text=Hi%20QuickPress%20Partner%20Support%2C%20I%20need%20help%20logging%20in%20to%20my%20store."
                target="_blank"
                rel="noreferrer"
                className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <MessageSquare className="size-4" />
                <span>Chat on WhatsApp Support</span>
              </a>

              <a
                href="tel:+919582391824"
                className="w-full py-3 px-4 rounded-xl border border-zinc-200 hover:bg-zinc-50 text-zinc-800 font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <Phone className="size-4" />
                <span>Call Helpline (+91 95823 91824)</span>
              </a>
            </div>

            <button
              type="button"
              onClick={() => setShowHelpModal(false)}
              className="w-full py-2 text-xs font-semibold text-zinc-500 hover:text-zinc-800 text-center block cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
