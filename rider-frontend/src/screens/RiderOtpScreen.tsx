import { useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Edit2, Loader2, RotateCcw, ShieldCheck } from "lucide-react";
import React, { useEffect, useRef, useState, type FormEvent, type KeyboardEvent, type ClipboardEvent } from "react";
import { toast } from "sonner";

import { useRiderContext } from "../context/RiderContext";
import { sendOtp, verifyOtp } from "../api/rider/rider-auth-api";
import { QuickPressLogo } from "../components/common/QuickPressLogo";
import { useLanguage } from "../lib/i18n";
import { isRiderApproved, isRiderOnboarded } from "../lib/auth-guard";

export function RiderOtpScreen() {
  const navigate = useNavigate();
  const { phone, setPhone, signIn } = useRiderContext();
  const { t } = useLanguage();

  // 6-digit OTP array
  const [digits, setDigits] = useState<string[]>(["", "", "", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [timer, setTimer] = useState(30);

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Safe phone resolution: check context, then search params, then sessionStorage / localStorage
  const [targetPhone, setTargetPhone] = useState<string>(() => {
    if (phone && phone.trim()) return phone.trim();
    if (typeof window !== "undefined") {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const qPhone = urlParams.get("phone");
        if (qPhone && qPhone.trim()) return qPhone.trim();
        const stored =
          window.sessionStorage.getItem("qp.rider.pendingPhone") ||
          window.localStorage.getItem("qp.rider.pendingPhone");
        if (stored && stored.trim()) return stored.trim();
      } catch {
        /* ignore */
      }
    }
    return "";
  });

  // Sync back to context if context didn't have it
  useEffect(() => {
    if (!phone && targetPhone) {
      setPhone(targetPhone);
    } else if (phone && phone !== targetPhone) {
      setTargetPhone(phone);
    }
  }, [phone, targetPhone, setPhone]);

  // If no phone at all, redirect to /auth (NEVER to non-existent /login)
  useEffect(() => {
    if (!targetPhone && !phone) {
      const timerId = setTimeout(() => {
        navigate({ to: "/auth" });
      }, 100);
      return () => clearTimeout(timerId);
    }
    inputRefs.current[0]?.focus();
  }, [targetPhone, phone, navigate]);

  // 30s countdown timer
  useEffect(() => {
    if (timer <= 0) return;
    const interval = setInterval(() => {
      setTimer((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [timer]);

  // Combined OTP code string
  const otpCode = digits.join("");

  // Handle individual digit change
  const handleDigitChange = (index: number, value: string) => {
    const cleanDigit = value.replace(/\D/g, "").slice(-1);
    const newDigits = [...digits];
    newDigits[index] = cleanDigit;
    setDigits(newDigits);

    // Auto-advance to next box if digit entered
    if (cleanDigit && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  // Handle backspace navigation
  const handleKeyDown = (index: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  // Handle paste full OTP
  const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!pastedData) return;

    const newDigits = ["", "", "", "", "", ""];
    for (let i = 0; i < pastedData.length; i++) {
      newDigits[i] = pastedData[i] || "";
    }
    setDigits(newDigits);

    // Focus on the next empty box or the last box
    const nextIndex = Math.min(pastedData.length, 5);
    inputRefs.current[nextIndex]?.focus();
  };

  // Handle Verify with Real Backend & Database Check
  const handleVerify = async (e?: FormEvent) => {
    if (e) e.preventDefault();
    if (otpCode.length !== 6 || loading) return;

    setLoading(true);

    try {
      // 1. Real Backend Phone OTP verification
      const effectivePhone = targetPhone || phone;
      const sessionResult = await verifyOtp(effectivePhone, otpCode);
      signIn(sessionResult);

      // 2. Check Database: Is rider already onboarded and approved?
      const onboarded = isRiderOnboarded(sessionResult);
      const approved = isRiderApproved(sessionResult);

      if (!onboarded) {
        toast.success("Phone verified! Please complete Captain Registration 🛵");
        navigate({ to: "/registration", replace: true });
      } else if (!approved) {
        toast.info("Your application is under verification ⏳");
        navigate({ to: "/verification", replace: true });
      } else {
        toast.success("Welcome back, Captain! Redirecting to Dashboard... 🚀");
        navigate({ to: "/dashboard", replace: true });
      }
    } catch (err: any) {
      toast.error(err?.message || "Invalid OTP code. Please enter valid 6-digit OTP.");
    } finally {
      setLoading(false);
    }
  };

  // Handle Resend OTP
  const handleResend = async () => {
    if (timer > 0 || resending) return;
    const effectivePhone = targetPhone || phone;
    if (!effectivePhone) {
      toast.error("Phone number missing. Please login again.");
      navigate({ to: "/auth" });
      return;
    }
    setResending(true);
    try {
      await sendOtp(effectivePhone);
      setTimer(30);
      toast.success("New 6-digit OTP sent to your phone! 📱");
    } catch (err: any) {
      toast.error(err?.message || "Failed to resend OTP");
    } finally {
      setResending(false);
    }
  };

  const formattedPhone = (targetPhone || phone || "").replace("+91", "").trim();

  return (
    <div
      className="relative flex flex-col flex-1 w-full min-h-[100dvh] max-w-md mx-auto bg-white text-neutral-900 select-none justify-between px-4 sm:px-5 overflow-y-auto"
      style={{
        paddingTop: "max(env(safe-area-inset-top, 0px) + 12px, 20px)",
        paddingBottom: "max(env(safe-area-inset-bottom, 0px) + 12px, 20px)",
      }}
    >
      {/* 1. Top Header with Back Arrow & Official Logo */}
      <div>
        <div className="flex items-center justify-between pb-3">
          <button
            type="button"
            onClick={() => navigate({ to: "/auth" })}
            className="flex items-center justify-center w-10 h-10 -ml-2 rounded-full hover:bg-neutral-100 text-neutral-900 active:scale-95 transition-transform"
            aria-label="Go Back"
          >
            <ArrowLeft className="w-6 h-6 stroke-[2.4]" />
          </button>

          <span className="text-[11px] font-black px-2.5 py-1 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-full">
            Step 2 of 2
          </span>
        </div>

        {/* Official QuickPress Brand Logo */}
        <div className="pt-2 pb-6">
          <QuickPressLogo size="lg" showSubtitle={true} subtitleText="DELIVERY PARTNER" />
        </div>

        {/* Heading & Subtitle */}
        <div className="text-center pb-6">
          <h2 className="text-xl font-black text-neutral-950 tracking-tight">
            {t("otp.title", "Enter 6-digit OTP")}
          </h2>
          <p className="text-xs font-semibold text-neutral-500 mt-1">
            {t("otp.sentTo", "Sent to")}{" "}
            <span className="text-neutral-950 font-bold">
              +91 {formattedPhone || "••••••••••"}
            </span>
          </p>
          <button
            type="button"
            onClick={() => navigate({ to: "/auth" })}
            className="inline-flex items-center gap-1 text-xs font-bold text-[#00C853] hover:underline mt-1.5"
          >
            <Edit2 className="w-3 h-3" />
            <span>{t("otp.changeNumber", "Change Number")}</span>
          </button>
        </div>

        {/* 2. 6-Digit Individual OTP Input Boxes */}
        <form onSubmit={handleVerify} className="space-y-6">
          <div className="flex items-center justify-between gap-1.5 sm:gap-2 px-0.5">
            {digits.map((digit, idx) => (
              <input
                key={idx}
                ref={(el) => {
                  inputRefs.current[idx] = el;
                }}
                type="tel"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleDigitChange(idx, e.target.value)}
                onKeyDown={(e) => handleKeyDown(idx, e)}
                onPaste={handlePaste}
                className={`w-11 sm:w-12 h-13 sm:h-14 text-center text-xl sm:text-2xl font-black rounded-2xl border-2 transition-all outline-none ${
                  digit
                    ? "border-[#00C853] bg-emerald-50/40 text-neutral-950 shadow-xs"
                    : "border-neutral-200 bg-white text-neutral-900 focus:border-[#00C853] focus:bg-emerald-50/20"
                }`}
              />
            ))}
          </div>

          {/* Resend Timer Row */}
          <div className="flex items-center justify-between px-2 text-xs pt-1">
            <span className="text-neutral-500 font-medium">
              {t("otp.didntReceive", "Didn't receive code?")}
            </span>
            {timer > 0 ? (
              <span className="font-bold text-neutral-700">
                {t("otp.resendIn", "Resend in")} {timer}s
              </span>
            ) : (
              <button
                type="button"
                onClick={handleResend}
                disabled={resending}
                className="flex items-center gap-1 font-black text-[#00C853] hover:underline active:scale-95"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>{resending ? "Sending..." : t("otp.resendOtp", "Resend OTP")}</span>
              </button>
            )}
          </div>
        </form>
      </div>

      {/* 3. Bottom Green Action Button */}
      <div className="pt-4 pb-2 space-y-3">
        <button
          type="button"
          onClick={handleVerify}
          disabled={loading || otpCode.length !== 6}
          className="w-full h-13.5 flex items-center justify-center bg-[#00C853] hover:bg-[#00B248] disabled:opacity-50 disabled:cursor-not-allowed text-white font-black text-sm tracking-wide rounded-2xl shadow-lg shadow-emerald-500/25 active:scale-98 transition-all"
        >
          {loading ? (
            <Loader2 className="w-5 h-5 animate-spin text-white" />
          ) : (
            <span>{t("otp.verifyContinue", "Verify & Continue")}</span>
          )}
        </button>

        <div className="flex items-center justify-center gap-1.5 text-[11px] text-neutral-500 font-medium">
          <ShieldCheck className="w-3.5 h-3.5 text-[#00C853]" />
          <span>QuickPress Captain 100% Secure Verification</span>
        </div>
      </div>
    </div>
  );
}
