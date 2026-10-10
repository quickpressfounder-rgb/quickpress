import { createFileRoute, Link, useNavigate, useRouter } from "@tanstack/react-router";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronDown,
  Gift,
  Loader2,
  MessageSquareLock,
  Smartphone,
  ShieldCheck,
  Tag,
  Timer,
  User,
  UserCheck,
  Sparkles,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import {
  fetchCountries,
  loginWithApple,
  loginWithGoogle,
  rememberCustomerLogin,
  requestOtp,
  restoreCustomerSession,
  type Country,
} from "@/api/customer/auth-api";
import { verifyCustomerOtp } from "@/lib/customer-auth";
import { updateProfile } from "@/api/customer/profile-api";
import { readSession, writeSession } from "@/api/core/session-store";
import { CACHE_KEYS, writeCache } from "@/api/customer/api/cache";
import { readLocation } from "@/api/customer/location";
import type { AuthSession } from "@/shared/types";

export const Route = createFileRoute("/login")({
  validateSearch: (search: Record<string, unknown>): { redirect?: string } => {
    const r = search["redirect"];
    return typeof r === "string" ? { redirect: r } : {};
  },
  head: () => ({
    meta: [
      { title: "QuickPress — Sign in with your mobile number" },
      {
        name: "description",
        content:
          "One secure step to enter QuickPress laundry pickup and delivery. Verify your mobile number with OTP — no password, no email.",
      },
      { property: "og:title", content: "QuickPress — Sign in with your mobile number" },
      {
        property: "og:description",
        content: "Verify your mobile number with OTP to enter QuickPress. No password required.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AuthScreen,
});

const FALLBACK_COUNTRY: Country = { code: "+91", label: "IN", digits: 10 };

const GENERIC_NAMES = [
  "customer",
  "quickpress customer",
  "quickpress user",
  "user",
  "guest",
  "client",
  "anonymous",
  "apple user",
  "google user",
  "verified customer",
  "test user",
  "new user",
];

export function isGenericName(name?: string | null): boolean {
  if (!name) return true;
  const clean = name.trim().toLowerCase();
  if (clean.length < 2) return true;
  // If numeric or phone number string
  if (/^\+?\d+$/.test(clean.replace(/\s+/g, ""))) return true;
  // If email format
  if (clean.includes("@")) return true;
  return GENERIC_NAMES.some((g) => clean === g || clean.startsWith(g));
}

/** Typographic brand lockup — wordmark instead of a logo mark. */
function BrandHeader() {
  return (
    <div className="flex flex-col items-center px-6 pt-[max(2.25rem,env(safe-area-inset-top))]">
      <div className="auth-logo-in auth-logo-float">
        <h1 className="auth-wordmark text-[2.75rem] font-black leading-none tracking-[-0.05em] sm:text-[3.25rem]">
          <span className="text-brand-dark">Quick</span>
          <span className="text-brand-green">Press</span>
        </h1>
      </div>

      <span className="auth-rise relative mt-3 block h-[3px] w-28 overflow-hidden rounded-full bg-primary/15 [animation-delay:80ms]">
        <span className="brand-sweep absolute inset-y-0 left-0 w-1/2 rounded-full bg-gradient-to-r from-transparent via-primary to-transparent" />
      </span>

      <p className="auth-rise mt-3 text-[11px] font-bold uppercase tracking-[0.3em] text-muted-foreground [animation-delay:140ms]">
        Laundry <span className="text-primary">·</span> Pickup{" "}
        <span className="text-primary">·</span> Delivery
      </p>

      {/* Decorative ambient bubbles */}
      <div className="pointer-events-none relative mt-2 h-6 w-40 opacity-70">
        <span className="auth-flow-bubble absolute bottom-3 left-[18%] size-2 rounded-full bg-brand-green/60" />
        <span className="auth-flow-bubble absolute bottom-2 left-[46%] size-1.5 rounded-full bg-primary/60 [animation-delay:600ms]" />
        <span className="auth-flow-bubble absolute bottom-4 left-[72%] size-2.5 rounded-full bg-brand-green/40 [animation-delay:1200ms]" />
      </div>
    </div>
  );
}

function AuthScreen() {
  const [step, setStep] = useState<"phone" | "otp" | "name">("phone");
  const [countries, setCountries] = useState<Country[]>([]);
  const [country, setCountry] = useState<Country>(FALLBACK_COUNTRY);
  const [phone, setPhone] = useState("");
  const [referralCode, setReferralCode] = useState("");
  const [sending, setSending] = useState(false);
  const [activeSession, setActiveSession] = useState<AuthSession | null>(null);
  const [initialSuggestedName, setInitialSuggestedName] = useState("");
  const navigate = useNavigate();
  const search = Route.useSearch();
  const redirectTarget = search?.redirect && search.redirect !== "/login" ? search.redirect : undefined;

  // GET /api/countries
  useEffect(() => {
    let alive = true;
    void fetchCountries().then((list) => {
      if (!alive || list.length === 0) return;
      setCountries(list);
      setCountry((prev) => list.find((item) => item.code === prev.code) ?? list[0]!);
    });
    return () => {
      alive = false;
    };
  }, []);

  const handleAuthSuccess = (session: AuthSession) => {
    setActiveSession(session);

    // Trigger native notification permission immediately after successful login
    window.dispatchEvent(new Event("qp:request-post-login-permissions"));

    const candidateName = session.account?.name || "";
    const isNew = Boolean(session.account?.isNewUser);
    const isGeneric = isGenericName(candidateName);

    if (isNew || isGeneric) {
      setInitialSuggestedName(isGeneric ? "" : candidateName);
      setStep("name");
    } else {
      if (redirectTarget) {
        void navigate({ to: redirectTarget as any });
      } else {
        const savedLoc = readLocation();
        void navigate({ to: savedLoc?.latitude ? "/home" : "/location" });
      }
    }
  };

  return (
    <main className="relative flex min-h-dvh flex-col bg-white dark:bg-zinc-950">
      <div className="relative flex w-full flex-1 flex-col">
        <div className="flex justify-end px-5 pt-[max(0.9rem,env(safe-area-inset-top))]">
          <button
            type="button"
            onClick={() => void navigate({ to: (redirectTarget as any) || "/home" })}
            className="min-h-11 rounded-full px-4 text-[13px] font-bold text-muted-foreground transition-colors hover:text-foreground"
          >
            Skip
          </button>
        </div>

        <BrandHeader />

        <div className="mx-auto mt-auto flex w-full max-w-md flex-col justify-end px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-8">
          <section
            key={step}
            className="auth-card rounded-[1.75rem] border border-border bg-card p-5 shadow-[0_24px_60px_-32px_rgba(0,0,0,0.35)] sm:p-6"
          >
            {step === "phone" ? (
              <PhoneStep
                countries={countries.length > 0 ? countries : [country]}
                country={country}
                setCountry={setCountry}
                phone={phone}
                setPhone={setPhone}
                referralCode={referralCode}
                setReferralCode={setReferralCode}
                sending={sending}
                redirectTarget={redirectTarget}
                onSuccessSession={handleAuthSuccess}
                onContinue={() => {
                  setSending(true);
                  // POST /api/auth/request-otp
                  void requestOtp(`${country.code}${phone}`)
                    .catch(() => undefined)
                    .finally(() => {
                      setSending(false);
                      setStep("otp");
                    });
                }}
              />
            ) : step === "otp" ? (
              <OtpStep
                phone={`${country.code}${phone}`}
                fullNumber={`${country.code} ${phone}`}
                referralCode={referralCode}
                redirectTarget={redirectTarget}
                onEdit={() => setStep("phone")}
                onSuccessSession={handleAuthSuccess}
              />
            ) : (
              <NameStep
                session={activeSession}
                initialName={initialSuggestedName}
                redirectTarget={redirectTarget}
                onBack={() => setStep("phone")}
              />
            )}
          </section>

          <p className="mt-5 flex items-center justify-center gap-1.5 text-[11px] font-medium text-muted-foreground">
            <ShieldCheck className="size-3.5 shrink-0 text-brand-green" aria-hidden />
            Secured with bank-grade OTP verification
          </p>
        </div>
      </div>
    </main>
  );
}

function PhoneStep({
  countries,
  country,
  setCountry,
  phone,
  setPhone,
  referralCode,
  setReferralCode,
  sending,
  redirectTarget,
  onContinue,
  onSuccessSession,
}: {
  countries: Country[];
  country: Country;
  setCountry: (c: Country) => void;
  phone: string;
  setPhone: (v: string) => void;
  referralCode: string;
  setReferralCode: (v: string) => void;
  sending: boolean;
  redirectTarget?: string | undefined;
  onContinue: () => void;
  onSuccessSession: (session: AuthSession) => void;
}) {
  const valid = phone.length === country.digits;
  const navigate = useNavigate();
  const [showReferral, setShowReferral] = useState(Boolean(referralCode));
  const [social, setSocial] = useState<"google" | "apple" | null>(null);
  const [socialError, setSocialError] = useState<string | null>(null);
  const [touched, setTouched] = useState(false);
  const invalid = touched && phone.length > 0 && !valid;

  // Auto login: Firebase user + stored QuickPress JWT → straight to home or redirect target.
  useEffect(() => {
    let active = true;
    void restoreCustomerSession()
      .then((restored) => {
        if (active && restored) {
          if (isGenericName(restored.account?.name)) {
            onSuccessSession(restored);
          } else if (redirectTarget) {
            void navigate({ to: redirectTarget as any });
          } else {
            void navigate({ to: "/home" });
          }
        }
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [navigate, redirectTarget, onSuccessSession]);

  /** Firebase social sign in → FastAPI exchange → QuickPress JWT session. */
  const signInWithProvider = async (provider: "google" | "apple") => {
    const label = provider === "google" ? "Google" : "Apple";
    setSocialError(null);
    setSocial(provider);
    try {
      rememberCustomerLogin(true);
      const session = await (provider === "google" ? loginWithGoogle(referralCode) : loginWithApple(referralCode));
      onSuccessSession(session);
    } catch (cause: any) {
      const code = String(cause?.code || "");
      const msg = String(cause?.message || "");
      if (code.includes("popup-closed") || msg.includes("popup-closed")) {
        setSocialError(null);
      } else if (code.includes("unauthorized-domain") || msg.includes("unauthorized-domain")) {
        setSocialError("Firebase Console me ye domain (Authorized Domains) me add karein.");
      } else {
        setSocialError(
          msg ? msg : `${label} sign-in complete nahi hua. Dobara try karein.`,
        );
      }
    } finally {
      setSocial(null);
    }
  };

  return (
    <div>
      <h2 className="auth-rise text-[1.6rem] font-black leading-tight tracking-[-0.03em] text-foreground">
        Welcome Back <span aria-hidden>👋</span>
      </h2>
      <p className="auth-rise mt-1.5 text-[13.5px] font-medium text-muted-foreground [animation-delay:60ms]">
        Continue with your mobile number
      </p>

      <form
        className="auth-rise mt-6 [animation-delay:120ms]"
        onSubmit={(event) => {
          event.preventDefault();
          setTouched(true);
          if (valid && !sending) onContinue();
        }}
      >
        <label
          htmlFor="qp-phone"
          className="mb-2 block text-[11.5px] font-bold uppercase tracking-[0.08em] text-muted-foreground"
        >
          Mobile number
        </label>

        <div
          className={`auth-field flex h-14 items-center overflow-hidden rounded-2xl border-2 bg-background ${invalid ? "input-invalid" : "border-border"
            }`}
        >
          <div className="relative flex h-full items-center border-r border-border pl-3.5">
            <Smartphone
              className="pointer-events-none size-[18px] shrink-0 text-muted-foreground"
              aria-hidden
            />
            <select
              aria-label="Country code"
              value={country.code}
              onChange={(event) => {
                const next = countries.find((c) => c.code === event.target.value);
                if (next) {
                  setCountry(next);
                  setPhone("");
                }
              }}
              className="h-full appearance-none bg-transparent pl-2 pr-7 text-[15px] font-bold text-foreground outline-none"
            >
              {countries.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.code}
                </option>
              ))}
            </select>
            <ChevronDown
              className="pointer-events-none absolute right-2 size-4 text-muted-foreground"
              aria-hidden
            />
          </div>

          <input
            id="qp-phone"
            type="tel"
            inputMode="numeric"
            pattern="[0-9]*"
            autoComplete="tel"
            autoFocus
            placeholder="00000 00000"
            aria-invalid={invalid}
            aria-describedby="qp-phone-hint"
            value={phone}
            onBlur={() => setTouched(true)}
            onChange={(event) =>
              setPhone(event.target.value.replace(/\D/g, "").slice(0, country.digits))
            }
            className="h-full min-w-0 flex-1 bg-transparent px-4 text-[17px] font-bold tracking-[0.06em] text-foreground outline-none placeholder:font-medium placeholder:tracking-normal placeholder:text-muted-foreground/60"
          />

          {valid ? (
            <span className="mr-4 grid size-6 shrink-0 place-items-center rounded-full bg-brand-green auth-pop">
              <Check className="size-3.5 text-background" aria-hidden />
            </span>
          ) : null}
        </div>

        <p
          id="qp-phone-hint"
          className={`mt-2 text-[12px] font-medium ${invalid ? "text-destructive" : "text-muted-foreground"}`}
          role={invalid ? "alert" : undefined}
        >
          {invalid
            ? `Enter a valid ${country.digits}-digit number`
            : `We'll send a ${6}-digit code to verify it's you`}
        </p>

        {/* Referral Code Box */}
        <div className="mt-3.5 pt-1">
          {!showReferral ? (
            <button
              type="button"
              onClick={() => setShowReferral(true)}
              className="flex items-center gap-1.5 text-xs font-bold text-primary transition-colors hover:underline"
            >
              <Gift className="size-3.5" />
              <span>Have a referral code? (Get +25 pts)</span>
            </button>
          ) : (
            <div className="space-y-1.5 rounded-2xl border border-primary/30 bg-primary/5 p-3 animate-in fade-in slide-in-from-top-1 duration-200">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="qp-referral"
                  className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.08em] text-foreground"
                >
                  <Gift className="size-3.5 text-primary" />
                  <span>Referral Code (Optional)</span>
                </label>
                <span className="rounded-full bg-primary/20 px-2 py-0.5 text-[10px] font-black text-brand-dark">
                  +25 Points
                </span>
              </div>
              <div className="relative flex h-11 items-center overflow-hidden rounded-xl border border-border bg-background px-3 transition-all focus-within:border-primary">
                <Tag className="mr-2 size-3.5 shrink-0 text-muted-foreground" />
                <input
                  id="qp-referral"
                  type="text"
                  placeholder="e.g. QP9258 / FRIEND"
                  value={referralCode}
                  onChange={(e) =>
                    setReferralCode(
                      e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 15),
                    )
                  }
                  className="h-full w-full bg-transparent text-xs font-bold uppercase tracking-wider text-foreground placeholder:font-normal placeholder:tracking-normal placeholder:text-muted-foreground/60 outline-none"
                />
                {referralCode.trim().length >= 3 && (
                  <span className="grid size-4 shrink-0 place-items-center rounded-full bg-brand-green text-background">
                    <Check className="size-2.5" />
                  </span>
                )}
              </div>
              <p className="text-[10px] font-medium text-muted-foreground">
                Get 25 Loyalty Points instantly on login!
              </p>
            </div>
          )}
        </div>

        <button
          type="submit"
          disabled={!valid || sending}
          className="btn-ripple mt-5 flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-primary text-[15.5px] font-black tracking-tight text-primary-foreground shadow-cta transition-all duration-300 active:scale-[0.985] disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground disabled:shadow-none"
        >
          {sending ? (
            <>
              <Loader2 className="size-5 animate-spin" aria-hidden />
              Sending OTP…
            </>
          ) : (
            <>
              Continue
              <ArrowRight className="size-[18px]" aria-hidden />
            </>
          )}
        </button>
      </form>

      <div className="mt-6 flex items-center gap-3">
        <span className="h-px flex-1 bg-border" />
        <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
          or
        </span>
        <span className="h-px flex-1 bg-border" />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <button
          type="button"
          disabled={social !== null}
          onClick={() => void signInWithProvider("google")}
          className="flex h-13 min-h-12 items-center justify-center gap-2 rounded-2xl border-2 border-border bg-card text-sm font-bold text-foreground transition-all duration-300 active:scale-[0.985] disabled:opacity-60"
        >
          {social === "google" ? (
            <Loader2 className="size-[18px] animate-spin" aria-hidden />
          ) : (
            <GoogleIcon />
          )}
          Google
        </button>
        <button
          type="button"
          disabled={social !== null}
          onClick={() => void signInWithProvider("apple")}
          className="flex h-13 min-h-12 items-center justify-center gap-2 rounded-2xl border-2 border-border bg-card text-sm font-bold text-foreground transition-all duration-300 active:scale-[0.985] disabled:opacity-60"
        >
          {social === "apple" ? (
            <Loader2 className="size-[18px] animate-spin" aria-hidden />
          ) : (
            <AppleIcon />
          )}
          Apple
        </button>
      </div>

      {socialError ? (
        <p
          className="animate-shake mt-3 text-center text-xs font-semibold text-destructive"
          role="alert"
        >
          {socialError}
        </p>
      ) : null}

      <p className="mt-6 text-center text-[11.5px] leading-relaxed text-muted-foreground">
        By creating an account, you acknowledge our{" "}
        <Link
          to="/legal/$docSlug"
          params={{ docSlug: "privacy-policy" }}
          className="font-bold text-foreground underline hover:text-primary transition-colors"
        >
          Privacy Policy
        </Link>{" "}
        and agree to the{" "}
        <Link
          to="/legal/$docSlug"
          params={{ docSlug: "terms-of-service" }}
          className="font-bold text-foreground underline hover:text-primary transition-colors"
        >
          Terms & Conditions
        </Link>.
      </p>
    </div>
  );
}

function OtpStep({
  phone,
  fullNumber,
  referralCode,
  redirectTarget,
  onEdit,
  onSuccessSession,
}: {
  phone: string;
  fullNumber: string;
  referralCode?: string;
  redirectTarget?: string | undefined;
  onEdit: () => void;
  onSuccessSession: (session: AuthSession) => void;
}) {
  const navigate = useNavigate();
  const router = useRouter();
  const [digits, setDigits] = useState<string[]>(Array(6).fill(""));
  const [seconds, setSeconds] = useState(30);
  const [verifying, setVerifying] = useState(false);
  const [verified, setVerified] = useState(false);
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const inputs = useRef<Array<HTMLInputElement | null>>([]);
  const code = useMemo(() => digits.join(""), [digits]);

  useEffect(() => {
    inputs.current[0]?.focus();
    // Home chunk pehle se load kar lo taaki verify ke baad flash na ho.
    void router.preloadRoute({ to: "/location" });
  }, [router]);

  useEffect(() => {
    if (seconds === 0) return;
    const timer = window.setTimeout(() => setSeconds((s) => s - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [seconds]);

  const fill = (value: string, index: number) => {
    const chars = value.replace(/\D/g, "").split("");
    if (chars.length === 0) return;
    setDigits((prev) => {
      const next = [...prev];
      chars.forEach((char, offset) => {
        if (index + offset < 6) next[index + offset] = char;
      });
      return next;
    });
    const focusAt = Math.min(index + chars.length, 5);
    inputs.current[focusAt]?.focus();
  };

  const verify = async () => {
    if (code.length !== 6 || verifying) return;
    setVerifying(true);
    setVerifyError(null);
    try {
      const session = await verifyCustomerOtp(phone, code, referralCode);
      setVerified(true);
      void router.preloadRoute({ to: "/location" }).catch(() => undefined);
      window.dispatchEvent(new Event("qp:prompt-name"));
      window.setTimeout(() => {
        onSuccessSession(session);
      }, 450);
    } catch (cause: unknown) {
      setVerifying(false);
      setDigits(Array(6).fill(""));
      inputs.current[0]?.focus();
      setVerifyError(
        cause instanceof Error && cause.message
          ? cause.message
          : "That OTP is incorrect. Please try again.",
      );
    }
  };

  // Blinkit-style: 6 digits complete hote hi auto verify.
  useEffect(() => {
    if (code.length === 6 && !verifying) verify();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code]);

  return (
    <div>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onEdit}
          aria-label="Change mobile number"
          className="grid size-11 shrink-0 place-items-center rounded-full border border-border bg-background text-foreground active:scale-95"
        >
          <ArrowLeft className="size-[18px]" aria-hidden />
        </button>
        <div className="min-w-0">
          <h2 className="truncate text-[1.25rem] font-black tracking-[-0.02em] text-foreground">
            Verify your number
          </h2>
          <p className="truncate text-[12.5px] font-medium text-muted-foreground">
            Code sent to <span className="font-bold text-foreground">{fullNumber}</span>
          </p>
        </div>
      </div>

      <div className="mt-5 flex items-center gap-2 rounded-2xl bg-muted/60 px-3.5 py-3">
        <MessageSquareLock className="size-[18px] shrink-0 text-brand-green" aria-hidden />
        <p className="text-[12.5px] font-medium text-muted-foreground">
          Enter the 6-digit code from your SMS
        </p>
      </div>

      <form
        className="mt-5"
        onSubmit={(event) => {
          event.preventDefault();
          verify();
        }}
      >
        <div className={`flex justify-between gap-2 ${verified ? "otp-success" : ""}`}>
          {digits.map((digit, index) => (
            <input
              key={index}
              ref={(element) => {
                inputs.current[index] = element;
              }}
              value={digit}
              inputMode="numeric"
              pattern="[0-9]*"
              autoComplete={index === 0 ? "one-time-code" : "off"}
              maxLength={6}
              aria-label={`Digit ${index + 1}`}
              onChange={(event) => fill(event.target.value, index)}
              onKeyDown={(event) => {
                if (event.key === "Backspace") {
                  event.preventDefault();
                  setDigits((prev) => {
                    const next = [...prev];
                    if (next[index]) next[index] = "";
                    else if (index > 0) next[index - 1] = "";
                    return next;
                  });
                  if (!digit && index > 0) inputs.current[index - 1]?.focus();
                }
                if (event.key === "ArrowLeft") inputs.current[index - 1]?.focus();
                if (event.key === "ArrowRight") inputs.current[index + 1]?.focus();
              }}
              className={`h-14 w-full rounded-xl border-2 bg-background text-center text-[20px] font-black text-foreground outline-none transition-all ${verified
                  ? "border-brand-green text-brand-green"
                  : digit
                    ? "border-foreground/70"
                    : "border-border"
                }`}
            />
          ))}
        </div>

        {verifyError ? (
          <p
            className="animate-shake mt-3 text-center text-xs font-semibold text-destructive"
            role="alert"
          >
            {verifyError}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={code.length !== 6 || verifying}
          className={`btn-ripple mt-5 flex h-14 w-full items-center justify-center gap-2 rounded-2xl text-[15.5px] font-black tracking-tight shadow-cta transition-all duration-300 active:scale-[0.985] disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground disabled:shadow-none ${verified ? "bg-brand-green text-background" : "bg-primary text-primary-foreground"
            }`}
        >
          {verified ? (
            <>
              <Check className="size-5 auth-pop" aria-hidden />
              Verified
            </>
          ) : verifying ? (
            <>
              <Loader2 className="size-5 animate-spin" aria-hidden />
              Verifying…
            </>
          ) : (
            <>
              Verify &amp; Continue
              <ArrowRight className="size-[18px]" aria-hidden />
            </>
          )}
        </button>

        <div className="mt-4 flex items-center justify-center gap-1.5 text-[12.5px] font-medium text-muted-foreground">
          {seconds > 0 ? (
            <>
              <Timer className="size-4 shrink-0" aria-hidden />
              <span aria-live="polite">
                Resend OTP in{" "}
                <span className="font-black text-foreground">
                  0:{seconds.toString().padStart(2, "0")}
                </span>
              </span>
            </>
          ) : (
            <button
              type="button"
              onClick={() => setSeconds(30)}
              className="min-h-11 px-3 font-black text-brand-green"
            >
              Resend OTP
            </button>
          )}
        </div>
      </form>

      <button
        type="button"
        onClick={onEdit}
        className="mt-2 min-h-11 w-full text-center text-[12.5px] font-bold text-foreground underline underline-offset-4"
      >
        Change mobile number
      </button>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="size-[18px]">
      <path
        fill="#4285F4"
        d="M23.52 12.27c0-.85-.08-1.67-.22-2.45H12v4.63h6.46a5.53 5.53 0 0 1-2.4 3.63v3h3.87c2.26-2.09 3.59-5.17 3.59-8.81Z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.96-1.08 7.94-2.92l-3.88-3a7.2 7.2 0 0 1-10.72-3.78H1.32v3.1A12 12 0 0 0 12 24Z"
      />
      <path
        fill="#FBBC05"
        d="M5.34 14.3a7.2 7.2 0 0 1 0-4.6V6.6H1.32a12 12 0 0 0 0 10.8l4.02-3.1Z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.43-3.43A11.96 11.96 0 0 0 12 0 12 12 0 0 0 1.32 6.6l4.02 3.1A7.2 7.2 0 0 1 12 4.75Z"
      />
    </svg>
  );
}

function AppleIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="size-[18px]">
      <path
        fill="currentColor"
        d="M16.36 12.72c.02 2.6 2.28 3.47 2.31 3.48-.02.06-.36 1.24-1.2 2.46-.72 1.05-1.47 2.1-2.66 2.12-1.16.02-1.54-.69-2.87-.69-1.33 0-1.75.67-2.85.71-1.14.04-2.01-1.12-2.74-2.17-1.6-2.3-2.82-6.5-1.18-9.35.81-1.41 2.27-2.31 3.85-2.33 1.12-.02 2.18.75 2.87.75.69 0 1.98-.93 3.34-.79.57.02 2.17.21 3.19 1.71-.08.05-1.87 1.1-1.86 3.29ZM14.3 3.9c.61-.74 1.02-1.77.91-2.8-.88.04-1.95.59-2.58 1.33-.57.65-1.05 1.7-.92 2.7.98.08 1.98-.5 2.59-1.23Z"
      />
    </svg>
  );
}

function NameStep({
  session,
  initialName,
  redirectTarget,
  onBack,
}: {
  session: AuthSession | null;
  initialName: string;
  redirectTarget?: string | undefined;
  onBack?: () => void;
}) {
  const navigate = useNavigate();
  const [name, setName] = useState(initialName);
  const [saving, setSaving] = useState(false);
  const [touched, setTouched] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cleanName = name.trim();
  const isValid = cleanName.length >= 2;
  const isInvalid = touched && !isValid;

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setTouched(true);
    if (!isValid || saving) return;

    setSaving(true);
    setError(null);
    try {
      // 1. Update remote backend profile
      await updateProfile({ name: cleanName });

      // 2. Update local session store
      const current = session || readSession("customer");
      if (current && current.account) {
        current.account.name = cleanName;
        current.account.isOnboarded = true;
        current.account.isNewUser = false;
        const initials =
          cleanName
            .split(/\s+/)
            .filter(Boolean)
            .map((p) => p[0])
            .slice(0, 2)
            .join("")
            .toUpperCase() || "QP";
        current.account.avatarInitials = initials;
        writeSession(current, "customer");

        // 3. Write cache for home screen & profile screen instant sync
        writeCache(CACHE_KEYS.profile, {
          id: current.account.id,
          name: cleanName,
          initials,
          phone: current.account.phone,
          email: current.account.email,
        });
      }

      sessionStorage.setItem("qp_name_prompt_dismissed", "true");

      // 4. Notify app components & trigger native device permissions
      window.dispatchEvent(new Event("qp:request-post-login-permissions"));
      window.dispatchEvent(new CustomEvent("qp:profile-updated", { detail: { name: cleanName } }));
      window.dispatchEvent(new Event("qp:login-success"));

      // 5. Navigate to destination
      if (redirectTarget) {
        void navigate({ to: redirectTarget as any });
      } else {
        const savedLoc = readLocation();
        void navigate({ to: savedLoc?.latitude ? "/home" : "/location" });
      }
    } catch (cause: any) {
      console.error("Failed to save name:", cause);
      setError(cause?.message || "Could not save your name. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleSkip = () => {
    sessionStorage.setItem("qp_name_prompt_dismissed", "true");
    window.dispatchEvent(new Event("qp:request-post-login-permissions"));
    window.dispatchEvent(new Event("qp:login-success"));
    if (redirectTarget) {
      void navigate({ to: redirectTarget as any });
    } else {
      const savedLoc = readLocation();
      void navigate({ to: savedLoc?.latitude ? "/home" : "/location" });
    }
  };

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        {onBack ? (
          <button
            type="button"
            onClick={onBack}
            className="grid size-10 place-items-center rounded-full border border-border bg-background text-foreground transition-colors hover:bg-muted active:scale-95"
            aria-label="Back"
          >
            <ArrowLeft className="size-4" />
          </button>
        ) : (
          <span />
        )}
        <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-green/10 px-3 py-1 text-[11px] font-extrabold uppercase tracking-wider text-brand-green">
          <Sparkles className="size-3 text-brand-green" />
          Profile Setup
        </span>
      </div>

      <div className="pt-2 text-center">
        <div className="auth-pop mx-auto mb-3.5 grid size-16 place-items-center rounded-3xl bg-brand-green/15 text-brand-green shadow-inner">
          <UserCheck className="size-8" />
        </div>
        <h2 className="text-[1.65rem] font-black leading-tight tracking-[-0.03em] text-foreground">
          What is your name?
        </h2>
        <p className="mt-1.5 text-[13.5px] font-medium leading-relaxed text-muted-foreground">
          Enter your name so your laundry captain and store partner can identify your pickup &amp; delivery orders.
        </p>
      </div>

      <form className="mt-6" onSubmit={handleSave}>
        <label
          htmlFor="qp-customer-name"
          className="mb-2 block text-[11.5px] font-bold uppercase tracking-[0.08em] text-muted-foreground"
        >
          Your Full Name
        </label>

        <div
          className={`auth-field flex h-14 items-center overflow-hidden rounded-2xl border-2 bg-background transition-all ${
            isInvalid ? "input-invalid" : isValid ? "border-brand-green/80" : "border-border"
          }`}
        >
          <div className="flex size-14 shrink-0 items-center justify-center border-r border-border text-muted-foreground">
            <User className="size-5" />
          </div>
          <input
            id="qp-customer-name"
            type="text"
            autoComplete="name"
            autoFocus
            placeholder="e.g. Rahul Sharma"
            value={name}
            onBlur={() => setTouched(true)}
            onChange={(e) => {
              setName(e.target.value);
              if (error) setError(null);
            }}
            className="h-full min-w-0 flex-1 bg-transparent px-4 text-[16px] font-bold text-foreground outline-none placeholder:font-normal placeholder:text-muted-foreground/60"
          />
          {isValid ? (
            <span className="auth-pop mr-3.5 grid size-6 shrink-0 place-items-center rounded-full bg-brand-green">
              <Check className="size-3.5 text-background" />
            </span>
          ) : null}
        </div>

        {isInvalid ? (
          <p className="animate-shake mt-2 text-xs font-semibold text-destructive" role="alert">
            Please enter at least 2 characters for your name.
          </p>
        ) : null}

        {error ? (
          <p className="animate-shake mt-2 text-xs font-semibold text-destructive" role="alert">
            {error}
          </p>
        ) : null}

        <div className="mt-3.5 flex items-center gap-2 rounded-xl bg-muted/60 px-3.5 py-2.5 text-[11.5px] font-medium text-muted-foreground">
          <ShieldCheck className="size-4 shrink-0 text-brand-green" />
          <span>Visible on pickup receipts, invoices &amp; order tracking.</span>
        </div>

        <button
          type="submit"
          disabled={!isValid || saving}
          className="btn-ripple shadow-cta mt-5 flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-primary text-[15.5px] font-black tracking-tight text-primary-foreground transition-all duration-300 active:scale-[0.985] disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground disabled:shadow-none"
        >
          {saving ? (
            <>
              <Loader2 className="size-5 animate-spin" aria-hidden />
              Saving name…
            </>
          ) : (
            <>
              Get Started
              <ArrowRight className="size-[18px]" aria-hidden />
            </>
          )}
        </button>

        <button
          type="button"
          disabled={saving}
          onClick={handleSkip}
          className="mt-3 min-h-11 w-full text-center text-[12.5px] font-bold text-muted-foreground transition-colors hover:text-foreground"
        >
          I'll add this later
        </button>
      </form>
    </div>
  );
}
