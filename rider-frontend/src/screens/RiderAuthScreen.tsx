import { useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Loader2, UserPlus, LogIn, AlertCircle, X } from "lucide-react";
import React, { useEffect, useState, type FormEvent } from "react";

import { useRiderContext } from "../context/RiderContext";
import { sendOtp, checkRiderRegistered } from "../api/rider/rider-auth-api";
import { readSession } from "../api/core/session-store";
import { isRiderApproved, isRiderOnboarded } from "../lib/auth-guard";
import { useLanguage } from "../lib/i18n";
import { QuickPressLogo } from "../components/common/QuickPressLogo";
import { triggerHaptic } from "../lib/captain-audio";

export function RiderAuthScreen() {
  const navigate = useNavigate();
  const { phone, session, setPhone } = useRiderContext();
  const { t, selectedLanguageObj } = useLanguage();

  const [authMode, setAuthMode] = useState<"login" | "register">("login");
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

  // Fast synchronous session check: redirect if already authenticated
  useEffect(() => {
    const sess = readSession("rider") || readSession();
    if (sess && sess.token) {
      if (!isRiderOnboarded(sess)) {
        navigate({ to: "/registration", replace: true });
      } else if (!isRiderApproved(sess)) {
        navigate({ to: "/verification", replace: true });
      } else {
        navigate({ to: "/dashboard", replace: true });
      }
    }
  }, [navigate]);

  const handleSubmit = async (e?: FormEvent) => {
    if (e) e.preventDefault();
    const cleanNumber = phoneNumber.replace(/\D/g, "");

    if (cleanNumber.length !== 10) {
      setError(t("auth.validPhone", "Enter a valid 10 digit mobile number"));
      return;
    }

    setError(null);
    setLoading(true);

    try {
      setPhone(cleanNumber);

      // Enforce: Unregistered accounts cannot log in!
      if (authMode === "login") {
        const check = await checkRiderRegistered(cleanNumber);
        if (!check.isRegistered) {
          setError(
            t(
              "auth.notRegistered",
              "This mobile number is not registered as a Captain. Please register first."
            )
          );
          setLoading(false);
          return;
        }
      } else {
        // In registration mode, if already onboarded, prompt to log in
        const check = await checkRiderRegistered(cleanNumber);
        if (check.isRegistered && check.isOnboarded) {
          setError(
            t(
              "auth.alreadyRegistered",
              "This number is already registered. Please switch to Login."
            )
          );
          setLoading(false);
          return;
        }
      }

      await sendOtp(cleanNumber);
      // Clean, quiet navigation to OTP without in-screen toast interruption
      navigate({ to: "/otp" });
    } catch (err: any) {
      setError(err?.message || "Failed to send OTP. Please check connection.");
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
        <div className="pt-2 pb-5">
          <QuickPressLogo size="lg" showSubtitle={true} subtitleText="DELIVERY PARTNER" />
        </div>

        {/* Mode Selector: Login vs Register */}
        <div className="flex items-center p-1 bg-neutral-100 rounded-2xl mb-6 border border-neutral-200/80">
          <button
            type="button"
            onClick={() => {
              triggerHaptic(15);
              setAuthMode("login");
              setError(null);
            }}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-black transition-all ${
              authMode === "login"
                ? "bg-white text-neutral-950 shadow-xs"
                : "text-neutral-500 hover:text-neutral-900"
            }`}
          >
            <LogIn className="w-4 h-4" />
            <span>{t("auth.loginTab", "Captain Login")}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              triggerHaptic(15);
              setAuthMode("register");
              setError(null);
            }}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-black transition-all ${
              authMode === "register"
                ? "bg-white text-neutral-950 shadow-xs"
                : "text-neutral-500 hover:text-neutral-900"
            }`}
          >
            <UserPlus className="w-4 h-4" />
            <span>{t("auth.registerTab", "New Registration")}</span>
          </button>
        </div>

        {/* Heading & Subtitle */}
        <div className="text-center pb-5">
          <h2 className="text-xl font-black text-neutral-950 tracking-tight">
            {authMode === "login"
              ? t("auth.signIn", "Sign in to your account")
              : t("auth.createAccount", "Register as New Captain")}
          </h2>
          <p className="text-xs font-semibold text-neutral-500 mt-1">
            {authMode === "login"
              ? t("auth.loginDesc", "Enter your registered mobile number to continue")
              : t("auth.registerDesc", "Join QuickPress with 0% commission & daily payouts")}
          </p>
        </div>

        {/* 2. Phone Input Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative flex items-center h-14 bg-white border-2 border-neutral-200 rounded-2xl focus-within:border-[#00C853] focus-within:shadow-xs transition-all px-4 gap-2.5">
            <div className="flex items-center gap-1.5 pr-2.5 border-r border-neutral-200 text-sm font-black text-neutral-800 shrink-0">
              <span className="text-base leading-none">🇮🇳</span>
              <span>+91</span>
            </div>

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

          {/* Error & Registration Prompt */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl space-y-2 text-left">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <p className="text-xs font-bold text-red-700 leading-tight">{error}</p>
              </div>

              {authMode === "login" && (
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode("register");
                    setError(null);
                  }}
                  className="w-full py-2 bg-white border border-red-300 text-red-700 font-black text-xs rounded-lg active:scale-98 transition-all flex items-center justify-center gap-1.5"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>Click here to Register as a Captain</span>
                </button>
              )}
            </div>
          )}

          <div className="px-1 space-y-1">
            <p className="text-xs font-medium text-neutral-500">
              {t("auth.validPhone", "Enter a valid 10 digit mobile number")}
            </p>
          </div>
        </form>
      </div>

      {/* 3. Bottom Green Action Button & Terms */}
      <div className="pt-4 pb-2 space-y-3">
        <button
          type="button"
          onClick={() => handleSubmit()}
          disabled={loading || phoneNumber.length !== 10}
          className="w-full h-13.5 flex items-center justify-center bg-[#00C853] hover:bg-[#00B248] disabled:opacity-50 disabled:cursor-not-allowed text-white font-black text-sm tracking-wide rounded-2xl shadow-lg shadow-emerald-500/25 active:scale-98 transition-all"
        >
          {loading ? (
            <Loader2 className="w-5 h-5 animate-spin text-white" />
          ) : (
            <span>
              {authMode === "login"
                ? t("auth.continueLogin", "Verify & Login")
                : t("auth.continueRegister", "Register as Captain")}
            </span>
          )}
        </button>

        <p className="text-[11px] text-neutral-500 text-center font-medium leading-tight">
          {t("auth.termsNotice", "By continuing, you agree to our Terms and Conditions")}
        </p>
      </div>
    </div>
  );
}
