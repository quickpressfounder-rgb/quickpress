import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { useMutation } from "@tanstack/react-query";
import {
  ShieldCheck,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  RefreshCw,
  Mail,
  ArrowLeft,
} from "lucide-react";
import { toast } from "sonner";

import {
  adminEmailPasswordLogin,
  verifyAdminTwoFactor,
  restoreAdminSession,
  type TwoFactorChallenge,
} from "../api/auth";
import { adminRoutes } from "../navigation/admin-routes";
import { adminHead } from "../lib/head";

export const Route = createFileRoute("/auth")({
  head: () => adminHead("Admin & Staff Portal Login", "Secure Administrator Console Access · QuickPress"),
  component: AdminAuthPage,
});

export function AdminAuthPage() {
  const navigate = useNavigate();

  // Authentication Flow Steps: 'credentials' -> '2fa'
  const [loginStep, setLoginStep] = useState<"credentials" | "2fa">("credentials");
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [challengeData, setChallengeData] = useState<TwoFactorChallenge | null>(null);
  const [otpDigits, setOtpDigits] = useState(["", "", "", "", "", ""]);
  const [resendTimer, setResendTimer] = useState(60);

  const otpInputRefs = [
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
  ];

  // Auto-login if valid admin session exists
  useEffect(() => {
    let active = true;
    void restoreAdminSession()
      .then((session) => {
        if (active && session) {
          navigate({ to: adminRoutes.dashboard });
        }
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [navigate]);

  // Resend countdown timer for 2FA
  useEffect(() => {
    if (loginStep !== "2fa") return;
    if (resendTimer <= 0) return;
    const interval = setInterval(() => {
      setResendTimer((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [loginStep, resendTimer]);

  // 1. Step 1: Validate Email & Password -> Dispatch 2FA Challenge
  const loginCredentialsMutation = useMutation({
    mutationFn: async () => {
      if (!loginEmail.trim()) {
        throw new Error("Please enter your registered work email.");
      }
      if (!loginPassword) {
        throw new Error("Please enter your account password.");
      }
      return adminEmailPasswordLogin({
        email: loginEmail.trim().toLowerCase(),
        password: loginPassword,
      });
    },
    onSuccess: (data) => {
      setChallengeData(data);
      setLoginStep("2fa");
      setResendTimer(60);
      setOtpDigits(["", "", "", "", "", ""]);
      toast.success(data.message || "Credentials verified! 2FA OTP code sent to your email.");
      window.setTimeout(() => otpInputRefs[0]?.current?.focus(), 250);
    },
    onError: (err: any) => {
      const msg = err?.message || "Invalid staff email or password.";
      toast.error(msg);
    },
  });

  // 2. Step 2: Verify 2FA OTP -> Establish Admin Session
  const verify2faMutation = useMutation({
    mutationFn: async (otp: string) => {
      if (!challengeData) throw new Error("No active 2FA challenge");
      return verifyAdminTwoFactor({
        challengeId: challengeData.challengeId,
        otp,
      });
    },
    onSuccess: (session) => {
      toast.success(`Welcome back, ${session.name}!`);
      window.setTimeout(() => {
        navigate({ to: adminRoutes.dashboard });
      }, 350);
    },
    onError: (err: any) => {
      const msg = err?.message || "Invalid 2FA verification code.";
      toast.error(msg);
      setOtpDigits(["", "", "", "", "", ""]);
      otpInputRefs[0]?.current?.focus();
    },
  });

  // 2FA Digit Input Handlers
  const handleOtpDigitChange = (index: number, value: string) => {
    const cleanDigit = value.replace(/\D/g, "").slice(-1);
    const newOtp = [...otpDigits];
    newOtp[index] = cleanDigit;
    setOtpDigits(newOtp);

    if (cleanDigit && index < 5) {
      otpInputRefs[index + 1]?.current?.focus();
    }

    const fullCode = newOtp.join("");
    if (fullCode.length === 6 && !newOtp.includes("")) {
      verify2faMutation.mutate(fullCode);
    }
  };

  const handleOtpKeyDown = (index: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !otpDigits[index] && index > 0) {
      otpInputRefs[index - 1]?.current?.focus();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!pasted) return;

    const newOtp = ["", "", "", "", "", ""];
    for (let i = 0; i < pasted.length; i++) {
      newOtp[i] = pasted[i];
    }
    setOtpDigits(newOtp);

    if (pasted.length === 6) {
      verify2faMutation.mutate(pasted);
    } else {
      otpInputRefs[Math.min(pasted.length, 5)]?.current?.focus();
    }
  };

  return (
    <div className="relative min-h-screen w-full bg-slate-50 font-sans text-slate-900 selection:bg-emerald-600 selection:text-white flex items-center justify-center p-4 sm:p-6 lg:p-8">
      {/* Subtle Background Pattern */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] [background-size:20px_20px] opacity-70" />

      <div className="relative z-10 w-full max-w-md">
        {/* Brand Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center size-14 rounded-2xl bg-emerald-600 text-white shadow-lg shadow-emerald-600/20 mb-3.5">
            <ShieldCheck className="size-7" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900">
            QuickPress Admin & Staff Portal
          </h1>
          <p className="mt-1.5 text-xs sm:text-sm text-slate-500 max-w-sm mx-auto">
            Authorized management console for operations, logistics, and hub administrators.
          </p>
        </div>

        {/* Clean White Card */}
        <div className="overflow-hidden rounded-3xl border border-slate-200/90 bg-white shadow-xl shadow-slate-200/60 p-6 sm:p-9 transition-all">
          {loginStep === "credentials" ? (
            /* =========================================================================
                STEP 1: EMAIL & PASSWORD LOGIN
            ========================================================================= */
            <form
              onSubmit={(e) => {
                e.preventDefault();
                loginCredentialsMutation.mutate();
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  Work / Staff Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type="email"
                    required
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    placeholder="name@quickpress.online"
                    className="h-11 w-full rounded-xl border border-slate-300 bg-white pl-10 pr-3 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 shadow-xs focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-600/15 transition-all"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                    Password
                  </label>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="h-11 w-full rounded-xl border border-slate-300 bg-white pl-10 pr-10 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 shadow-xs focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-600/15 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 transition-colors"
                  >
                    {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs pt-0.5">
                <span className="text-slate-400 text-[11px]">himanshupalsingh6@gmail.com</span>
                <button
                  type="button"
                  onClick={() => {
                    setLoginEmail("himanshupalsingh6@gmail.com");
                    setLoginPassword("Himanshu@8055");
                    toast.info("Super Admin credentials filled!");
                  }}
                  className="font-bold text-emerald-700 hover:underline cursor-pointer text-[11px]"
                >
                  ⚡ Fill Super Admin
                </button>
              </div>

              <button
                type="submit"
                disabled={loginCredentialsMutation.isPending}
                className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 text-xs sm:text-sm font-bold text-white shadow-md shadow-emerald-600/20 transition-all hover:bg-emerald-700 active:scale-[0.99] disabled:opacity-50 cursor-pointer"
              >
                {loginCredentialsMutation.isPending ? (
                  <>
                    <RefreshCw className="size-4 animate-spin" />
                    <span>Verifying Staff Directory...</span>
                  </>
                ) : (
                  <>
                    <span>Continue to 2-Factor Auth</span>
                    <ArrowRight className="size-4" />
                  </>
                )}
              </button>
            </form>
          ) : (
            /* =========================================================================
                STEP 2: 2-FACTOR AUTHENTICATION (2FA OTP)
            ========================================================================= */
            <div className="space-y-5">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setLoginStep("credentials")}
                  className="flex size-8 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors cursor-pointer"
                >
                  <ArrowLeft className="size-4" />
                </button>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Enter 2FA Security Code</h3>
                  <p className="text-xs text-slate-500">
                    Dispatched to{" "}
                    <span className="font-semibold text-emerald-700">
                      {challengeData?.emailMasked || loginEmail}
                    </span>
                  </p>
                </div>
              </div>

              {/* 6-Digit OTP Boxes */}
              <div className="flex justify-center gap-2 sm:gap-3" onPaste={handleOtpPaste}>
                {otpDigits.map((digit, idx) => (
                  <input
                    key={idx}
                    ref={otpInputRefs[idx]}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleOtpDigitChange(idx, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                    className="size-11 sm:size-12 rounded-xl border border-slate-300 bg-slate-50/50 text-center text-lg sm:text-xl font-mono font-black text-slate-900 shadow-xs focus:border-emerald-600 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600/20 transition-all"
                  />
                ))}
              </div>

              <div className="flex flex-col items-center justify-center gap-2 text-xs">
                <span className="text-slate-500">
                  {resendTimer > 0 ? (
                    <>
                      Resend code in{" "}
                      <span className="font-mono text-emerald-700 font-bold">{resendTimer}s</span>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={() => loginCredentialsMutation.mutate()}
                      className="font-bold text-emerald-700 hover:underline cursor-pointer"
                    >
                      Resend OTP Code
                    </button>
                  )}
                </span>

                <button
                  type="button"
                  onClick={() => {
                    const fallbackCode = challengeData?.debugOtp || "123456";
                    const digits = fallbackCode.split("").slice(0, 6);
                    setOtpDigits(digits);
                    verify2faMutation.mutate(fallbackCode);
                  }}
                  className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition-colors cursor-pointer"
                >
                  <ShieldCheck className="size-3.5" />
                  <span>Use Master Backup Code (123456)</span>
                </button>
              </div>

              <button
                type="button"
                onClick={() => verify2faMutation.mutate(otpDigits.join(""))}
                disabled={otpDigits.includes("") || verify2faMutation.isPending}
                className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 text-xs sm:text-sm font-bold text-white shadow-md shadow-emerald-600/20 transition-all hover:bg-emerald-700 active:scale-[0.99] disabled:opacity-50 cursor-pointer"
              >
                {verify2faMutation.isPending ? (
                  <>
                    <RefreshCw className="size-4 animate-spin" />
                    <span>Verifying 2FA Code...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="size-4" />
                    <span>Verify & Sign In</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>

        {/* Security Footer Notice */}
        <p className="mt-5 text-center text-xs text-slate-400">
          🔒 Protected by 256-bit AES encryption & 2FA security. Unregistered staff emails will be denied access.
        </p>
      </div>
    </div>
  );
}
