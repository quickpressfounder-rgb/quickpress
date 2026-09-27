import { useNavigate } from "@tanstack/react-router";
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  Check,
  CheckCircle2,
  Globe,
  Headphones,
  KeyRound,
  Loader2,
  Lock,
  MessageSquareLock,
  Phone,
  RotateCcw,
  ShieldCheck,
  Smartphone,
  Sparkles,
} from "lucide-react";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { toast } from "sonner";

import { Toaster } from "@/shared/ui/sonner";
import { usePartnerContext } from "../context/PartnerContext";
import { useOtpCountdown } from "../hooks/use-otp-countdown";
import { partnerRoutes } from "../navigation/partner-routes";
import { checkPartnerVerificationStatus, requestOtp, verifyOtp } from "@/api/partner/partner-auth-api";
import { PartnerAuthHeader } from "../components/PartnerAuthHeader";

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
    toast.success("Mobile number verified successfully!");

    // Check ground-truth verification & onboarding status from MongoDB
    let realIsOnboarded = session.isOnboarded;
    let realIsVerified = session.isVerified;
    try {
      const statusRes = await checkPartnerVerificationStatus();
      if (statusRes) {
        realIsOnboarded = Boolean(statusRes.isOnboarded);
        realIsVerified = Boolean(statusRes.isVerified);
      }
    } catch {}

    const resolvedSession = {
      ...session,
      isOnboarded: realIsOnboarded,
      isVerified: realIsVerified,
    };
    signIn(resolvedSession);

    window.setTimeout(() => {
      if (realIsOnboarded && realIsVerified) {
        navigate({ to: partnerRoutes.dashboard });
      } else if (!realIsOnboarded) {
        navigate({ to: partnerRoutes.registration });
      } else {
        navigate({ to: partnerRoutes.registrationSubmitted });
      }
    }, 600);
  };

  const handleResend = async () => {
    try {
      await requestOtp(targetPhone);
    } catch (cause) {
      toast.error(
        cause instanceof Error ? cause.message : "Could not resend OTP. Please try again.",
      );
      return;
    }
    restart();
    setDigits("");
    inputRef.current?.focus();
    toast.success("New OTP sent to your phone");
  };

  return (
    <div className="min-h-screen bg-white text-[#111827] flex flex-col justify-between font-sans selection:bg-[#F4B400]/30">
      {/* Background Ambience / Clean Modern Glow */}
      <div className="pointer-events-none fixed -top-32 left-1/2 size-[30rem] -translate-x-1/2 rounded-full bg-emerald-500/5 blur-3xl" />
      <div className="pointer-events-none fixed -bottom-40 left-1/2 size-[26rem] -translate-x-1/2 rounded-full bg-emerald-600/5 blur-3xl" />

      {/* ========================================================================= */}
      {/* MOBILE OTP SCREEN (< md)                                                  */}
      {/* ========================================================================= */}
      <div className="relative flex min-h-screen flex-col justify-between p-4 sm:p-6 md:hidden max-w-md mx-auto w-full">
        <div className="pt-2">
          {/* Top Bar with Back action & Wordmark */}
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => navigate({ to: partnerRoutes.auth })}
              className="flex size-9 items-center justify-center rounded-full bg-white/90 border border-zinc-200 text-zinc-700 shadow-2xs active:scale-95 transition-all"
            >
              <ArrowLeft className="size-4" />
            </button>
            <span className="text-sm font-black text-[#111827]">
              Quick<span className="text-[#16A34A]">Press</span>
            </span>
          </div>

          <div className="mt-4 flex flex-col items-center">
            <PartnerAuthHeader badge="SECURITY" withTagline={false} />
          </div>

          <div className="mt-6 rounded-3xl border border-zinc-200/90 bg-white/95 backdrop-blur-md p-6 shadow-[0_20px_50px_-15px_rgba(0,0,0,0.07)]">
            <div className="flex size-11 items-center justify-center rounded-2xl bg-amber-100/80 text-amber-900 border border-amber-200 mb-3">
              <KeyRound className="size-5" />
            </div>
            <h1 className="text-2xl font-black tracking-tight text-[#111827]">
              Verify OTP Code
            </h1>
            <p className="mt-1 text-xs text-zinc-500 font-medium">
              Enter the 6-digit code sent to{" "}
              <span className="font-black text-[#111827]">{displayPhone()}</span>
            </p>

            <form onSubmit={handleVerify} className="mt-6">
              <div className="relative">
                <input
                  ref={inputRef}
                  type="tel"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  value={digits}
                  onChange={(e) => setDigits(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  className="absolute inset-0 z-10 size-full cursor-pointer bg-transparent text-transparent caret-transparent outline-none"
                />
                <div className="flex items-center justify-between gap-1.5 sm:gap-2">
                  {Array.from({ length: 6 }).map((_, i) => {
                    const filled = Boolean(digits[i]);
                    const active = digits.length === i;
                    return (
                      <div
                        key={i}
                        className={`flex h-13 flex-1 items-center justify-center rounded-2xl border-2 bg-zinc-50 text-xl font-black tracking-tight text-[#111827] transition-all ${
                          verified
                            ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                            : active
                            ? "border-[#111827] bg-white shadow-xs scale-105"
                            : filled
                            ? "border-zinc-400 bg-white"
                            : "border-zinc-200"
                        }`}
                      >
                        {filled ? digits[i] : null}
                      </div>
                    );
                  })}
                </div>
              </div>

              <button
                type="submit"
                disabled={busy || verified || digits.length !== 6}
                className="btn-ripple mt-6 flex h-[54px] w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-amber-400 to-amber-500 text-zinc-950 font-black text-xs uppercase tracking-wider shadow-cta transition-all hover:brightness-105 active:scale-[0.98] disabled:opacity-50 cursor-pointer"
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
                  <span>Verify & Enter Store →</span>
                )}
              </button>

              <div className="mt-5 text-center">
                <button
                  type="button"
                  disabled={!canResend || verified}
                  onClick={handleResend}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-zinc-700 hover:text-zinc-950 disabled:text-zinc-400 cursor-pointer"
                >
                  <RotateCcw className="size-3.5" />
                  <span>{canResend ? "Resend OTP SMS" : `Resend OTP in ${remaining}s`}</span>
                </button>
              </div>
            </form>
          </div>
        </div>

        <div className="py-2 text-center">
          <p className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-zinc-500">
            <ShieldCheck className="size-3.5 text-[#16A34A]" />
            <span>Encrypted Mobile Number Verification</span>
          </p>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* DESKTOP OTP SCREEN (>= md)                                                */}
      {/* ========================================================================= */}
      <div className="hidden md:flex min-h-screen w-full flex-col justify-between p-8 xl:p-12 relative z-10 max-w-6xl mx-auto">
        <header className="flex items-center justify-between pb-6">
          <PartnerAuthHeader badge="SECURITY CHECK" withTagline={true} />

          <button
            type="button"
            onClick={() => navigate({ to: partnerRoutes.auth })}
            className="flex items-center gap-1.5 rounded-2xl border border-zinc-200 bg-white px-4 py-2 text-xs font-bold text-zinc-700 shadow-2xs hover:bg-zinc-50 active:scale-95 transition-all cursor-pointer"
          >
            <ArrowLeft className="size-4" />
            <span>Change Phone Number</span>
          </button>
        </header>

        <main className="my-auto py-8 grid grid-cols-12 gap-10 items-center">
          {/* Left Security Highlights */}
          <div className="col-span-6 space-y-5 pr-4">
            <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-800 border border-emerald-200">
              <ShieldCheck className="size-4 text-[#16A34A]" />
              <span>TWO-FACTOR ACCOUNT SECURITY</span>
            </div>
            <h2 className="text-4xl font-black leading-tight tracking-tight text-[#111827]">
              Secure Two-Factor Authentication For Your Store.
            </h2>
            <p className="text-sm font-medium text-zinc-600 leading-relaxed max-w-md">
              Every sign in is verified through an instant one-time password to protect your active orders, settlement ledger, and customer records.
            </p>

            <div className="pt-2 border-t border-zinc-200/80">
              <p className="text-xs font-semibold text-zinc-500">
                Code sent to: <span className="font-black text-[#111827] text-sm">{displayPhone()}</span>
              </p>
            </div>
          </div>

          {/* Right OTP Verification Card */}
          <div className="col-span-6 flex justify-end">
            <div className="w-full max-w-md rounded-3xl border border-zinc-200/90 bg-white p-8 shadow-lg">
              <div className="mb-6">
                <span className="text-xs font-bold uppercase tracking-wider text-amber-800 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200">
                  Step 2 of 2
                </span>
                <h3 className="mt-3 text-2xl font-black tracking-tight text-[#111827]">
                  Enter Verification Code
                </h3>
                <p className="mt-1 text-xs font-medium text-zinc-500">
                  Enter the 6-digit code received on your phone.
                </p>
              </div>

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
                    className="absolute inset-0 z-10 size-full cursor-pointer bg-transparent text-transparent caret-transparent outline-none"
                  />
                  <div className="flex items-center justify-between gap-2.5">
                    {Array.from({ length: 6 }).map((_, i) => {
                      const filled = Boolean(digits[i]);
                      const active = digits.length === i;
                      return (
                        <div
                          key={i}
                          className={`flex h-14 flex-1 items-center justify-center rounded-2xl border-2 bg-zinc-50 text-2xl font-black tracking-tight text-[#111827] transition-all ${
                            verified
                              ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                              : active
                              ? "border-[#111827] bg-white shadow-md scale-105"
                              : filled
                              ? "border-zinc-400 bg-white"
                              : "border-zinc-200"
                          }`}
                        >
                          {filled ? digits[i] : null}
                        </div>
                      );
                    })}
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={busy || verified || digits.length !== 6}
                  className="flex w-full h-14 items-center justify-center gap-2 rounded-2xl bg-[#F4B400] font-black text-xs uppercase tracking-wider text-[#111827] shadow-sm transition-all hover:brightness-105 active:scale-[0.98] disabled:opacity-50 cursor-pointer"
                >
                  {busy ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      <span>Verifying Code...</span>
                    </>
                  ) : verified ? (
                    <>
                      <Check className="size-4 stroke-[3]" />
                      <span>Verified! Redirecting...</span>
                    </>
                  ) : (
                    <span>Verify Code & Enter Dashboard</span>
                  )}
                </button>

                <div className="text-center">
                  <button
                    type="button"
                    disabled={!canResend || verified}
                    onClick={handleResend}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-zinc-600 hover:text-zinc-950 disabled:text-zinc-400 cursor-pointer"
                  >
                    <RotateCcw className="size-3.5" />
                    <span>{canResend ? "Resend OTP SMS" : `Resend OTP in ${remaining}s`}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        </main>

        <footer className="flex items-center justify-between border-t border-zinc-200/80 pt-6 text-xs text-zinc-500">
          <span>© 2026 QuickPress Technologies Inc.</span>
          <span className="flex items-center gap-1 text-[#16A34A] font-semibold">
            <CheckCircle2 className="size-3.5" /> Encrypted 256-Bit Authentication
          </span>
        </footer>
      </div>

      <Toaster />
    </div>
  );
}
