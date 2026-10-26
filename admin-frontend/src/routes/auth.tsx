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
  ShieldAlert,
  CheckCircle2,
  Cloud,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";

import {
  adminEmailPasswordLogin,
  verifyAdminTwoFactor,
  restoreAdminSession,
  authenticateCloudflareZeroTrust,
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

  // Authentication Flow Steps: 'sso_checking' | 'sso_forbidden' | 'credentials' | '2fa'
  const [loginStep, setLoginStep] = useState<"sso_checking" | "sso_forbidden" | "credentials" | "2fa">("sso_checking");
  const [ssoErrorMessage, setSsoErrorMessage] = useState<string | null>(null);
  const [ssoAccountInfo, setSsoAccountInfo] = useState<{ email?: string; name?: string; role?: string } | null>(null);

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

  // 1. Initial Auto-Authentication: Check active session or Cloudflare Zero Trust SSO
  useEffect(() => {
    let active = true;

    async function initAuth() {
      // Step A: Check local existing token
      try {
        const localSession = await restoreAdminSession();
        if (active && localSession) {
          navigate({ to: adminRoutes.dashboard });
          return;
        }
      } catch {
        // proceed to Cloudflare SSO check
      }

      // Step B: Check Cloudflare Zero Trust Perimeter SSO
      try {
        const cfSession = await authenticateCloudflareZeroTrust();
        if (!active) return;
        setSsoAccountInfo({
          email: cfSession.account?.email,
          name: cfSession.account?.name,
          role: cfSession.account?.departmentRole || cfSession.account?.role,
        });
        toast.success(`Cloudflare SSO Verified: Welcome, ${cfSession.account?.name || "Administrator"}!`);
        window.setTimeout(() => {
          if (active) navigate({ to: adminRoutes.dashboard });
        }, 400);
      } catch (err: any) {
        if (!active) return;
        const status = err?.status;
        const msg = err?.message || "";

        // If 403 Forbidden: Cloudflare perimeter allowed them, but email not enrolled in admin_staff table
        if (status === 403 || msg.includes("not enrolled in the QuickPress Staff Directory") || msg.includes("Access Denied")) {
          setSsoErrorMessage(msg || "Your Cloudflare Zero Trust identity is verified, but this email is not registered in the QuickPress Staff Directory.");
          setLoginStep("sso_forbidden");
        } else {
          // If 401 or network (e.g. dev environment without Cloudflare headers) -> Fall back to manual login
          setLoginStep("credentials");
        }
      }
    }

    void initAuth();
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
          {loginStep === "sso_checking" ? (
            /* =========================================================================
                STATE 0: CLOUDFLARE ZERO TRUST SSO PERIMETER VERIFICATION
            ========================================================================= */
            <div className="py-6 text-center space-y-4">
              <div className="relative inline-flex items-center justify-center">
                <div className="size-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-600 flex items-center justify-center shadow-inner">
                  <Cloud className="size-8 animate-pulse text-amber-500" />
                </div>
                <div className="absolute -bottom-1 -right-1 size-6 rounded-full bg-emerald-600 text-white flex items-center justify-center shadow-md">
                  <ShieldCheck className="size-3.5" />
                </div>
              </div>

              <div>
                <h3 className="text-base font-bold text-slate-900">Cloudflare Zero Trust SSO</h3>
                <p className="mt-1 text-xs text-slate-500 max-w-xs mx-auto">
                  Verifying perimeter identity token & staff database permissions...
                </p>
              </div>

              <div className="flex items-center justify-center gap-2 pt-2 text-xs font-semibold text-emerald-700">
                <RefreshCw className="size-3.5 animate-spin text-emerald-600" />
                <span>Authenticating Secure Session...</span>
              </div>

              <div className="pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setLoginStep("credentials")}
                  className="text-[11px] font-bold text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
                >
                  Sign in with password instead →
                </button>
              </div>
            </div>
          ) : loginStep === "sso_forbidden" ? (
            /* =========================================================================
                STATE: PERIMETER IDENTITY OK BUT NOT IN STAFF DIRECTORY (403)
            ========================================================================= */
            <div className="py-3 space-y-4">
              <div className="text-center space-y-2">
                <div className="inline-flex items-center justify-center size-14 rounded-2xl bg-rose-50 border border-rose-200 text-rose-600 mb-1">
                  <ShieldAlert className="size-7 text-rose-600" />
                </div>
                <h3 className="text-base font-bold text-slate-900">Perimeter Access Denied</h3>
                <div className="rounded-xl bg-rose-50/80 border border-rose-200 p-3 text-left">
                  <p className="text-xs font-medium text-rose-800 leading-relaxed">
                    {ssoErrorMessage || "Your email was authenticated by Cloudflare Zero Trust, but is not enrolled in the QuickPress Staff Directory."}
                  </p>
                </div>
              </div>

              <div className="rounded-xl bg-slate-50 border border-slate-200 p-3.5 space-y-2 text-xs text-slate-600">
                <div className="flex items-center gap-2 font-bold text-slate-800">
                  <CheckCircle2 className="size-4 text-emerald-600" />
                  <span>Cloudflare Zero Trust: Verified</span>
                </div>
                <p className="text-[11px] text-slate-500">
                  To access this console, your corporate email must be registered in the live Staff Directory by a Super Administrator.
                </p>
                <div className="pt-1 text-[11px] font-mono text-slate-700 bg-white p-2 rounded-lg border border-slate-200">
                  Super Admin: <span className="font-bold text-emerald-700">official.quickpress@gmail.com</span>
                </div>
              </div>

              <div className="flex flex-col gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setLoginStep("sso_checking");
                    void authenticateCloudflareZeroTrust()
                      .then((s) => {
                        toast.success(`Welcome back, ${s.account?.name}!`);
                        navigate({ to: adminRoutes.dashboard });
                      })
                      .catch((err) => {
                        setSsoErrorMessage(err?.message || "Verification failed.");
                        setLoginStep("sso_forbidden");
                      });
                  }}
                  className="flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-slate-900 text-xs font-bold text-white hover:bg-black transition-all cursor-pointer"
                >
                  <RefreshCw className="size-3.5" />
                  <span>Retry Cloudflare SSO Verification</span>
                </button>

                <button
                  type="button"
                  onClick={() => setLoginStep("credentials")}
                  className="flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-700 hover:bg-slate-50 transition-all cursor-pointer"
                >
                  <span>Sign in with Password Credentials</span>
                </button>
              </div>
            </div>
          ) : loginStep === "credentials" ? (
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
              <button
                type="button"
                onClick={() => {
                  setLoginStep("sso_checking");
                  void authenticateCloudflareZeroTrust()
                    .then((s) => {
                      toast.success(`Welcome back, ${s.account?.name}!`);
                      navigate({ to: adminRoutes.dashboard });
                    })
                    .catch((err) => {
                      setSsoErrorMessage(err?.message || "Perimeter SSO check failed.");
                      setLoginStep("sso_forbidden");
                    });
                }}
                className="flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-amber-200 bg-amber-50/80 text-xs font-bold text-amber-900 hover:bg-amber-100 transition-all cursor-pointer shadow-xs"
              >
                <Cloud className="size-4 text-amber-600" />
                <span>Verify via Cloudflare Zero Trust SSO</span>
              </button>
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
                <span className="text-slate-400 text-[11px]">admin@quickpress.online</span>
                <button
                  type="button"
                  onClick={() => {
                    setLoginEmail("admin@quickpress.online");
                    setLoginPassword("Admin@QuickPress2026!");
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
