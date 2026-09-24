import { useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Loader2, X } from "lucide-react";
import React, { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";

import { useRiderContext } from "../context/RiderContext";
import { sendOtp } from "../api/rider/rider-auth-api";
import { readSession } from "../api/core/session-store";
import { isRiderApproved, isRiderOnboarded } from "../lib/auth-guard";
import { useLanguage } from "../lib/i18n";
import { QuickPressLogo } from "../components/common/QuickPressLogo";

export function RiderAuthScreen() {
  const navigate = useNavigate();
  const { phone, session, setPhone } = useRiderContext();
  const { t, selectedLanguageObj } = useLanguage();

  const [phoneNumber, setPhoneNumber] = useState(() => {
    if (phone) return phone.replace(/\D/g, "").slice(-10);
    if (typeof window !== "undefined") {
      try {
        const stored =
          window.sessionStorage.getItem("qp.rider.pendingPhone") ||
          window.localStorage.getItem("qp.rider.pendingPhone");
        if (stored) return stored.replace(/\D/g, "").slice(-10);
      } catch {
        /* ignore */
      }
    }
    return "";
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fast synchronous session check: redirect immediately if already authenticated
  useEffect(() => {
    const sess = readSession("rider") || readSession();
    if (sess && sess.token) {
      if (isRiderApproved(sess)) {
        navigate({ to: "/dashboard", replace: true });
      } else if (isRiderOnboarded(sess)) {
        navigate({ to: "/verification", replace: true });
      } else {
        navigate({ to: "/registration", replace: true });
      }
    }
  }, [navigate]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const cleanNumber = phoneNumber.replace(/\D/g, "");

    if (cleanNumber.length !== 10) {
      setError(t("auth.validPhone", "Enter a valid 10 digit mobile number"));
      toast.error(t("auth.validPhone", "Enter a valid 10 digit mobile number"));
      return;
    }

    setError(null);
    setLoading(true);

    try {
      setPhone(cleanNumber);
      await sendOtp(cleanNumber);
      toast.success(t("auth.otpSent", "6-digit OTP sent via SMS! 📱"));
      navigate({ to: "/otp" });
    } catch (err: any) {
      setError(err?.message || "Failed to send OTP. Please try again.");
      toast.error(err?.message || "Failed to send OTP");
    } finally {
      setLoading(false);
    }
  };

  const clearPhone = () => {
    setPhoneNumber("");
    setError(null);
  };

  return (
    <div
      className="relative flex flex-col flex-1 w-full min-h-[100dvh] max-w-md mx-auto bg-white text-neutral-900 select-none justify-between px-5 overflow-y-auto"
      style={{
        paddingTop: "max(env(safe-area-inset-top, 0px) + 12px, 20px)",
        paddingBottom: "max(env(safe-area-inset-bottom, 0px) + 12px, 20px)",
      }}
    >
      {/* 1. Header with Back Arrow & Official QuickPress Brand Logo */}
      <div>
        <div className="flex items-center justify-between pb-2">
          <button
            type="button"
            onClick={() => navigate({ to: "/language" })}
            className="flex items-center justify-center w-10 h-10 -ml-2 rounded-full hover:bg-neutral-100 text-neutral-900 active:scale-95 transition-transform"
            aria-label="Go Back"
          >
            <ArrowLeft className="w-6 h-6 stroke-[2.4]" />
          </button>

          <button
            type="button"
            onClick={() => navigate({ to: "/language" })}
            className="flex items-center gap-1 px-2.5 py-1 bg-neutral-100 rounded-full text-xs font-bold text-neutral-700 hover:bg-neutral-200 transition-colors"
          >
            <span>🌐 {selectedLanguageObj.nativeName}</span>
          </button>
        </div>

        {/* Official Brand Logo */}
        <div className="pt-2 pb-6">
          <QuickPressLogo size="lg" showSubtitle={true} subtitleText="DELIVERY PARTNER" />
        </div>

        {/* Heading & Subtitle */}
        <div className="text-center pb-6">
          <h2 className="text-xl font-black text-neutral-950 tracking-tight">
            {t("auth.signIn", "Sign in to your account")}
          </h2>
          <p className="text-xs font-semibold text-neutral-500 mt-1">
            {t("auth.loginOrCreate", "Login or create an account")}
          </p>
        </div>

        {/* 2. Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Phone Input Box: [ 🇮🇳 +91 | 9258730561  (x) ] */}
          <div className="relative flex items-center h-14 bg-white border-2 border-neutral-200 rounded-2xl focus-within:border-[#00C853] focus-within:shadow-xs transition-all px-4 gap-2.5">
            {/* Flag & Prefix */}
            <div className="flex items-center gap-1.5 pr-2.5 border-r border-neutral-200 text-sm font-black text-neutral-800 shrink-0">
              <span className="text-base leading-none">🇮🇳</span>
              <span>+91</span>
            </div>

            {/* Input Field */}
            <input
              type="tel"
              maxLength={10}
              placeholder={t("auth.enterPhone", "Enter mobile number")}
              value={phoneNumber}
              onChange={(e) => {
                const val = e.target.value.replace(/\D/g, "");
                setPhoneNumber(val);
                if (error) setError(null);
              }}
              className="w-full h-full bg-transparent text-base font-black text-neutral-900 tracking-wider placeholder:text-neutral-400 focus:outline-none"
              autoFocus
            />

            {/* Clear (x) button when typed */}
            {phoneNumber.length > 0 && (
              <button
                type="button"
                onClick={clearPhone}
                className="flex items-center justify-center w-5 h-5 rounded-full bg-neutral-200 hover:bg-neutral-300 text-neutral-600"
              >
                <X className="w-3.5 h-3.5 stroke-[2.5]" />
              </button>
            )}
          </div>

          {/* Helper Text & Help Link */}
          <div className="px-1 space-y-1">
            <p className="text-xs font-medium text-neutral-500">
              {t("auth.validPhone", "Enter a valid 10 digit mobile number")}
            </p>
            {error && (
              <p className="text-xs font-bold text-red-500">{error}</p>
            )}
            <p className="text-xs font-medium text-neutral-500 pt-0.5">
              {t("auth.lostPhone", "Lost your phone number?")}{" "}
              <span
                onClick={() => toast.info("Captain Support Helpline: +91 92587 30561")}
                className="text-blue-600 font-bold hover:underline cursor-pointer"
              >
                {t("auth.reachUs", "Reach us")}
              </span>
            </p>
          </div>
        </form>
      </div>

      {/* 3. Bottom Green Action Button & Terms */}
      <div className="pt-4 pb-2 space-y-3">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={loading || phoneNumber.length !== 10}
          className="w-full h-13.5 flex items-center justify-center bg-[#00C853] hover:bg-[#00B248] disabled:opacity-50 disabled:cursor-not-allowed text-white font-black text-sm tracking-wide rounded-2xl shadow-lg shadow-emerald-500/25 active:scale-98 transition-all"
        >
          {loading ? (
            <Loader2 className="w-5 h-5 animate-spin text-white" />
          ) : (
            <span>{t("auth.continue", "Continue")}</span>
          )}
        </button>

        <p className="text-[11px] text-neutral-500 text-center font-medium leading-tight">
          {t("auth.termsNotice", "By continuing, you agree to our Terms and Conditions")}
        </p>
      </div>
    </div>
  );
}
