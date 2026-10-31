import { useNavigate } from "@tanstack/react-router";
import {
  ArrowLeft,
  Check,
  CheckCircle2,
  KeyRound,
  Loader2,
  Lock,
  RotateCcw,
  ShieldCheck,
} from "lucide-react";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { toast } from "sonner";

import { Toaster } from "@/shared/ui/sonner";
import { usePartnerContext } from "../context/PartnerContext";
import { useOtpCountdown } from "../hooks/use-otp-countdown";
import { partnerRoutes } from "../navigation/partner-routes";
import { checkPartnerVerificationStatus, requestOtp, verifyOtp } from "@/api/partner/partner-auth-api";
import {
  areAllMerchantPermissionsGranted,
  hasCompletedPermissionsOnboarding,
} from "../lib/merchant-device-opt";

export function OtpVerificationScreen() {
  const navigate = useNavigate();
  const { phone, signIn } = usePartnerContext();
  const { remaining, canResend, restart } = useOtpCountdown(45);
  const [digits, setDigits] = useState("");
  const [busy, setBusy] = useState(false);
  const [verified, setVerified] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const targetPhone =
    phone ||
    (typeof window !== "undefined"
      ? window.sessionStorage.getItem("qp.partner.pendingPhone") ||
        window.localStorage.getItem("qp.partner.pendingPhone") ||
        window.localStorage.getItem("qp.partner.rememberedPhone") ||
        ""
      : "");

  const displayPhone = () => {
    const digitsOnly = targetPhone.replace(/\D/g, "");
    if (!digitsOnly) return "+91 98765 43210";
    const last10 = digitsOnly.slice(-10);
    return `+91 ${last10.slice(0, 5)} ${last10.slice(5)}`;
  };

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (digits.length === 6 && !busy && !verified) {
      void handleVerify();
    }
  }, [digits, busy, verified]);

  const handleVerify = async (event?: FormEvent) => {
    event?.preventDefault();
    if (busy || verified) return;
    if (digits.length !== 6) {
      toast.error("Please enter the complete 6-digit code");
      return;
    }
    setBusy(true);

    let session;
    try {
      session = await verifyOtp(targetPhone, digits);
    } catch (cause) {
      setBusy(false);
      setDigits("");
      inputRef.current?.focus();
      toast.error(
        cause instanceof Error ? cause.message : "That OTP is incorrect. Please try again.",
      );
      return;
    }
    setBusy(false);
    setVerified(true);

    // Check ground-truth verification & onboarding status
    let realIsOnboarded = session.isOnboarded;
    let realIsVerified = session.isVerified;
    try {
      const statusRes = await checkPartnerVerificationStatus();
      if (statusRes) {
        realIsOnboarded = Boolean(statusRes.isOnboarded);
        realIsVerified = Boolean(statusRes.isVerified);
      }
    } catch {}

    const resolved = { ...session, isOnboarded: realIsOnboarded, isVerified: realIsVerified };
    signIn(resolved);

    toast.success("Phone verified successfully!");

    window.setTimeout(() => {
      if (!realIsOnboarded) {
        navigate({ to: partnerRoutes.registration, replace: true });
      } else if (realIsVerified) {
        if (hasCompletedPermissionsOnboarding() || areAllMerchantPermissionsGranted()) {
          navigate({ to: partnerRoutes.orders, replace: true });
        } else {
          navigate({ to: partnerRoutes.permissions, replace: true });
        }
      } else {
        navigate({ to: partnerRoutes.registrationSubmitted, replace: true });
      }
    }, 350);
  };

  const handleResend = async () => {
    try {
      await requestOtp(targetPhone);
      toast.success("New OTP sent via SMS!");
    } catch (cause) {
      toast.error(
        cause instanceof Error ? cause.message : "Could not resend OTP. Please try again.",
      );
      return;
    }
    restart();
    setDigits("");
    inputRef.current?.focus();
  };

  return (
    <div className="min-h-screen bg-white text-zinc-900 font-sans selection:bg-blue-500/20">
      <Toaster richColors position="top-center" />

      <div className="min-h-screen flex flex-col justify-between max-w-sm sm:max-w-md mx-auto w-full px-5 py-4 animate-in fade-in duration-200">
        <div>
          {/* Top Bar with Back Action & Edit Link */}
          <div className="flex items-center justify-between pt-1">
            <button
              type="button"
              onClick={() => navigate({ to: partnerRoutes.auth })}
              className="size-9 rounded-full bg-zinc-100 hover:bg-zinc-200 text-zinc-700 flex items-center justify-center transition-all cursor-pointer active:scale-95"
              aria-label="Back to login"
            >
              <ArrowLeft className="size-4" />
            </button>
            <button
              type="button"
              onClick={() => navigate({ to: partnerRoutes.auth })}
              className="text-xs font-bold text-[#2563eb] hover:underline cursor-pointer"
            >
              Edit Number
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

          <h2 className="text-xl font-black text-center text-zinc-900 tracking-tight">
            Verify OTP Code
          </h2>
          <p className="text-center text-sm font-medium text-zinc-600 mt-1 mb-6 px-3">
            Enter the 6-digit code sent to{" "}
            <span className="font-bold text-zinc-950">{displayPhone()}</span>
          </p>

          {/* 6-Digit OTP Box Form */}
          <form onSubmit={handleVerify} className="space-y-6">
            <div className="relative">
              <input
                ref={inputRef}
                type="tel"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                value={digits}
                onChange={(e) => setDigits(e.target.value.replace(/\D/g, "").slice(0, 6))}
                className="absolute inset-0 z-10 size-full cursor-pointer bg-transparent text-transparent caret-transparent outline-none focus:outline-none"
              />
              <div className="flex items-center justify-between gap-2">
                {Array.from({ length: 6 }).map((_, i) => {
                  const filled = Boolean(digits[i]);
                  const active = digits.length === i;
                  return (
                    <div
                      key={i}
                      className={`flex h-13 sm:h-14 flex-1 items-center justify-center rounded-xl border-2 text-xl font-black tracking-tight transition-all select-none ${
                        verified
                          ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                          : active
                          ? "border-[#2563eb] bg-blue-50/20 shadow-xs scale-105"
                          : filled
                          ? "border-zinc-400 bg-white text-zinc-950"
                          : "border-zinc-200 bg-zinc-50 text-zinc-400"
                      }`}
                    >
                      {filled ? digits[i] : ""}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Verify Button */}
            <button
              type="submit"
              disabled={busy || verified || digits.length !== 6}
              className={`w-full h-12 rounded-xl font-bold text-sm tracking-wide transition-all flex items-center justify-center gap-2 ${
                digits.length === 6 && !busy && !verified
                  ? "bg-[#2563eb] hover:bg-[#1d4ed8] text-white shadow-sm active:scale-[0.98] cursor-pointer"
                  : verified
                  ? "bg-emerald-600 text-white cursor-default"
                  : "bg-zinc-200 text-zinc-400 cursor-not-allowed"
              }`}
            >
              {busy ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  <span>Verifying Code...</span>
                </>
              ) : verified ? (
                <>
                  <Check className="size-4 stroke-[3]" />
                  <span>Verified! Entering Store...</span>
                </>
              ) : (
                <span>Verify & Enter Store</span>
              )}
            </button>

            {/* Resend OTP */}
            <div className="text-center pt-2">
              <button
                type="button"
                disabled={!canResend || verified}
                onClick={handleResend}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-700 hover:text-zinc-950 disabled:text-zinc-400 cursor-pointer"
              >
                <RotateCcw className="size-3.5" />
                <span>
                  {canResend ? "Resend OTP SMS" : `Resend OTP in ${remaining}s`}
                </span>
              </button>
            </div>
          </form>
        </div>

        {/* Footer Security Badge */}
        <div className="text-center pt-8 pb-3">
          <p className="text-[11px] text-zinc-400 flex items-center justify-center gap-1.5 font-medium">
            <ShieldCheck className="size-3.5 text-emerald-600" />
            Bank-grade encrypted login · QuickPress Partner Console
          </p>
        </div>
      </div>
    </div>
  );
}
