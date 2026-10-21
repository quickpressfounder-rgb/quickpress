import { Link, useNavigate } from "@tanstack/react-router";
import {
  AlertCircle,
  ArrowRight,
  BadgeCheck,
  BarChart3,
  Check,
  CheckCircle2,
  Coins,
  CreditCard,
  Globe,
  Headphones,
  KeyRound,
  Layers,
  LineChart,
  Loader2,
  Lock,
  LogIn,
  Phone,
  Shield,
  ShieldCheck,
  ShoppingBag,
  Sliders,
  Smartphone,
  Sparkles,
  Store,
  TrendingUp,
  Truck,
  UserPlus,
  X,
  Zap,
} from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";

import { Toaster } from "@/shared/ui/sonner";
import { usePartnerContext } from "../context/PartnerContext";
import { partnerRoutes } from "../navigation/partner-routes";
import { validateMobile } from "../lib/partner-validation";
import {
  checkPartnerRegistered,
  checkPartnerVerificationStatus,
  loginWithGoogle,
  rememberPartnerLogin,
  requestOtp,
} from "@/api/partner/partner-auth-api";
import { PartnerAuthHeader } from "../components/PartnerAuthHeader";

const BENEFIT_CARDS = [
  {
    icon: ShoppingBag,
    title: "More Orders",
    desc: "Get customers from your local area effortlessly.",
    color: "bg-blue-500/15 text-blue-600",
  },
  {
    icon: Sliders,
    title: "Easy Service Management",
    desc: "Manage your laundry services, rates and active pricing.",
    color: "bg-sky-500/15 text-sky-600",
  },
  {
    icon: Coins,
    title: "Real-time Earnings",
    desc: "Track daily orders, gross revenue and weekly bank payouts.",
    color: "bg-indigo-500/15 text-indigo-600",
  },
  {
    icon: BarChart3,
    title: "Business Growth",
    desc: "Understand your operational performance with clear analytics.",
    color: "bg-cyan-500/15 text-cyan-600",
  },
];

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
      <path fill="#FBBC05" d="M5.2 14.3a7.2 7.2 0 0 1 0-4.6V6.6H1.3a12 12 0 0 0 0 10.8l3.9-3.1Z" />
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

  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notRegistered, setNotRegistered] = useState(false);
  const [alreadyRegistered, setAlreadyRegistered] = useState(false);
  const [remember, setRemember] = useState(true);
  const [busy, setBusy] = useState(false);
  const [googleBusy, setGoogleBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [lang, setLang] = useState<"en" | "hi">("en");

  // Redirect if already authenticated
  useEffect(() => {
    if (hydrating || !session) return;
    if (session.isOnboarded === false) {
      navigate({ to: partnerRoutes.registration, replace: true });
    } else if (!session.isVerified) {
      navigate({ to: partnerRoutes.registrationSubmitted, replace: true });
    } else {
      navigate({ to: partnerRoutes.dashboard, replace: true });
    }
  }, [hydrating, session, navigate]);

  // Restore remembered phone number
  useEffect(() => {
    const saved = window.localStorage.getItem(REMEMBER_KEY);
    if (saved) {
      setValue(saved);
      setRemember(true);
    }
  }, []);

  const handleContinue = async (event?: FormEvent) => {
    event?.preventDefault();
    if (busy || sent) return;

    const message = validateMobile(value);
    if (message) {
      setError(message);
      toast.error(message);
      return;
    }
    setError(null);
    setNotRegistered(false);
    setAlreadyRegistered(false);
    setBusy(true);

    const digits = value.replace(/\D/g, "").slice(-10);

    try {
      // 1. Strict Enforcement: Verify registration status in MongoDB & Supabase
      const check = await checkPartnerRegistered(digits);

      if (authMode === "login") {
        // ENFORCE: Unregistered accounts cannot log in!
        if (!check.isRegistered || !check.isOnboarded) {
          const notRegMsg =
            lang === "hi"
              ? "यह मोबाइल नंबर पार्टनर स्टोर के रूप में पंजीकृत नहीं है। कृपया पहले पंजीकरण करें।"
              : "This mobile number is not registered as a Partner Store. Please register first.";
          setError(notRegMsg);
          setNotRegistered(true);
          setBusy(false);
          return;
        }
      } else {
        // In registration mode: If already registered and onboarded, prompt to login
        if (check.isRegistered && check.isOnboarded) {
          const alreadyRegMsg =
            lang === "hi"
              ? "यह मोबाइल नंबर पहले से पंजीकृत है। कृपया पार्टनर लॉगिन पर जाएं।"
              : "This mobile number is already registered. Please switch to Partner Login.";
          setError(alreadyRegMsg);
          setAlreadyRegistered(true);
          setBusy(false);
          return;
        }
      }

      if (remember) window.localStorage.setItem(REMEMBER_KEY, digits);
      else window.localStorage.removeItem(REMEMBER_KEY);
      rememberPartnerLogin(remember);

      // 2. Request real Firebase Phone OTP
      await requestOtp(digits);
      setPhone(digits);
      setSent(true);
      window.setTimeout(() => navigate({ to: partnerRoutes.otp }), 300);
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

      // Strict Redirection: Unregistered users MUST complete registration
      if (!realIsOnboarded) {
        navigate({ to: partnerRoutes.registration, replace: true });
      } else if (!realIsVerified) {
        navigate({ to: partnerRoutes.registrationSubmitted, replace: true });
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
    setValue("");
    setError(null);
    setNotRegistered(false);
    setAlreadyRegistered(false);
  };

  return (
    <div className="min-h-screen bg-white text-[#111827] flex flex-col justify-between font-sans selection:bg-primary/20">
      {/* Background Ambience / Clean Modern Glow */}
      <div className="pointer-events-none fixed -top-32 left-1/2 size-[30rem] -translate-x-1/2 rounded-full bg-primary/5 blur-3xl" />
      <div className="pointer-events-none fixed -bottom-40 left-1/2 size-[26rem] -translate-x-1/2 rounded-full bg-sky-500/5 blur-3xl" />

      {/* ========================================================================= */}
      {/* MOBILE EXPERIENCE (< 1024px)                                              */}
      {/* ========================================================================= */}
      <div className="relative flex flex-col justify-between min-h-screen p-4 sm:p-6 lg:hidden max-w-md mx-auto w-full">
        {/* Top Header with Brand Wordmark */}
        <div className="pt-2 flex flex-col items-center">
          <div className="w-full flex justify-end mb-1">
            {/* Language Selector */}
            <button
              type="button"
              onClick={() => setLang(lang === "en" ? "hi" : "en")}
              className="flex items-center gap-1.5 rounded-full border border-zinc-200/90 bg-white/90 px-3 py-1.5 text-[11px] font-bold text-zinc-700 shadow-2xs active:scale-95 transition-all backdrop-blur-xs cursor-pointer"
            >
              <Globe className="size-3.5 text-zinc-500" />
              <span>{lang === "en" ? "English" : "हिंदी"}</span>
            </button>
          </div>

          <PartnerAuthHeader badge="PARTNER" withTagline={true} />
        </div>

        {/* Mobile Login Card Container */}
        <div className="my-auto py-4">
          <div className="rounded-3xl border border-zinc-200/80 bg-white/95 backdrop-blur-md p-6 sm:p-7 shadow-[0_20px_50px_-15px_rgba(0,0,0,0.07)]">
            {/* Mode Switcher: Login vs Register (Same as Rider Panel) */}
            <div className="flex items-center p-1 bg-zinc-100 rounded-2xl mb-5 border border-zinc-200/80">
              <button
                type="button"
                onClick={() => {
                  setAuthMode("login");
                  setError(null);
                  setNotRegistered(false);
                  setAlreadyRegistered(false);
                }}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                  authMode === "login"
                    ? "bg-white text-zinc-950 shadow-xs border border-zinc-200/60"
                    : "text-zinc-500 hover:text-zinc-900"
                }`}
              >
                <LogIn className="w-4 h-4 text-primary" />
                <span>{lang === "hi" ? "पार्टनर लॉगिन" : "Partner Login"}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setAuthMode("register");
                  setError(null);
                  setNotRegistered(false);
                  setAlreadyRegistered(false);
                }}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                  authMode === "register"
                    ? "bg-white text-zinc-950 shadow-xs border border-zinc-200/60"
                    : "text-zinc-500 hover:text-zinc-900"
                }`}
              >
                <Store className="w-4 h-4 text-emerald-600" />
                <span>{lang === "hi" ? "नया पंजीकरण" : "New Registration"}</span>
              </button>
            </div>

            {/* Card Title */}
            <div>
              <div className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-0.5 text-[10.5px] font-black text-amber-900 border border-amber-200/80 mb-2">
                <Sparkles className="size-3 text-amber-600" />
                <span>{authMode === "login" ? "PARTNER BUSINESS PORTAL" : "JOIN AS PARTNER STORE"}</span>
              </div>
              <h2 className="text-2xl font-black tracking-tight text-[#111827]">
                {authMode === "login"
                  ? lang === "hi"
                    ? "वापसी पर स्वागत है 👋"
                    : "Welcome Back 👋"
                  : lang === "hi"
                  ? "नया पार्टनर स्टोर जोड़ें 🏪"
                  : "Register Partner Store 🏪"}
              </h2>
              <p className="mt-1 text-xs font-medium text-zinc-500">
                {authMode === "login"
                  ? lang === "hi"
                    ? "ऑर्डर, सेवाएं और कमाई प्रबंधित करने के लिए साइन इन करें।"
                    : "Log in to manage orders, services and earnings."
                  : lang === "hi"
                  ? "QuickPress के साथ जुड़ें और दैनिक लॉन्ड्री ऑर्डर प्राप्त करें।"
                  : "Join QuickPress with 0% onboarding fee & instant daily payouts."}
              </p>
            </div>

            {/* Mobile Form */}
            <form onSubmit={handleContinue} className="mt-5 space-y-4">
              <div>
                <label
                  htmlFor="mobile-input-mob"
                  className="block text-xs font-black uppercase tracking-wider text-zinc-700 mb-1.5"
                >
                  {lang === "hi" ? "मोबाइल नंबर" : "Mobile Number"}
                </label>
                <div
                  className={`flex h-[54px] items-center rounded-2xl border-2 bg-zinc-50/90 px-3.5 transition-all ${
                    error
                      ? "border-red-500 bg-red-50/20"
                      : "border-zinc-200 focus-within:border-primary focus-within:bg-white focus-within:shadow-sm"
                  }`}
                >
                  <span className="flex items-center gap-1.5 border-r border-zinc-200 pr-3 text-xs font-black text-[#111827]">
                    <span>🇮🇳</span>
                    <span>+91</span>
                  </span>
                  <input
                    id="mobile-input-mob"
                    type="tel"
                    inputMode="numeric"
                    autoComplete="tel-national"
                    maxLength={10}
                    value={value}
                    onChange={(e) => {
                      setValue(e.target.value.replace(/\D/g, "").slice(0, 10));
                      if (error) {
                        setError(null);
                        setNotRegistered(false);
                        setAlreadyRegistered(false);
                      }
                    }}
                    placeholder={lang === "hi" ? "10 अंकों का मोबाइल नंबर दर्ज करें" : "Enter mobile number"}
                    className="w-full bg-transparent pl-3 text-base font-black tracking-wider text-[#111827] placeholder:text-zinc-400 placeholder:font-medium placeholder:text-xs focus:outline-none"
                    autoFocus
                  />
                  {value.length > 0 && (
                    <button
                      type="button"
                      onClick={clearPhone}
                      className="flex items-center justify-center w-5 h-5 rounded-full bg-zinc-200 hover:bg-zinc-300 text-zinc-600 shrink-0 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Interactive Error / Redirect Alert */}
                {error && notRegistered ? (
                  <div className="mt-3 p-3.5 rounded-2xl bg-amber-50 border border-amber-200/90 text-amber-950 space-y-2 animate-in fade-in duration-200">
                    <div className="flex items-start gap-2.5">
                      <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                      <p className="text-xs font-bold leading-snug">{error}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setAuthMode("register");
                        setError(null);
                        setNotRegistered(false);
                      }}
                      className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-amber-600 text-white font-black text-xs hover:bg-amber-700 transition-colors shadow-2xs cursor-pointer"
                    >
                      <span>{lang === "hi" ? "नया पार्टनर पंजीकरण करें →" : "Register as New Partner Store →"}</span>
                    </button>
                  </div>
                ) : error && alreadyRegistered ? (
                  <div className="mt-3 p-3.5 rounded-2xl bg-blue-50 border border-blue-200/90 text-blue-950 space-y-2 animate-in fade-in duration-200">
                    <div className="flex items-start gap-2.5">
                      <AlertCircle className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                      <p className="text-xs font-bold leading-snug">{error}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setAuthMode("login");
                        setError(null);
                        setAlreadyRegistered(false);
                      }}
                      className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-primary text-white font-black text-xs hover:bg-primary-dark transition-colors shadow-2xs cursor-pointer"
                    >
                      <span>{lang === "hi" ? "पार्टनर लॉगिन पर जाएं →" : "Switch to Partner Login →"}</span>
                    </button>
                  </div>
                ) : error ? (
                  <p className="mt-1.5 text-xs font-bold text-red-600 animate-in fade-in duration-200">
                    {error}
                  </p>
                ) : null}
              </div>

              {/* Primary Action Button */}
              <button
                type="submit"
                disabled={busy || sent || value.length < 10}
                className="btn-ripple flex h-[54px] w-full items-center justify-center gap-2 rounded-2xl bg-primary hover:bg-primary-dark text-white font-black text-sm uppercase tracking-wider shadow-md shadow-primary/20 transition-all hover:brightness-105 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
              >
                {busy ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    <span>{lang === "hi" ? "सत्यापित कर रहे हैं..." : "Verifying & Sending OTP..."}</span>
                  </>
                ) : (
                  <>
                    <span>
                      {authMode === "login"
                        ? lang === "hi"
                          ? "OTP से लॉगिन करें →"
                          : "Login with OTP →"
                        : lang === "hi"
                        ? "OTP से रजिस्टर करें →"
                        : "Register with OTP →"}
                    </span>
                  </>
                )}
              </button>

              {/* OR Divider */}
              <div className="relative my-4 text-center">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-zinc-200" />
                </div>
                <span className="relative bg-white px-3 text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
                  {lang === "hi" ? "या" : "OR"}
                </span>
              </div>

              {/* Google Button */}
              <button
                type="button"
                onClick={handleGoogle}
                disabled={googleBusy}
                className="flex h-[52px] w-full items-center justify-center gap-2.5 rounded-2xl border border-zinc-200/90 bg-white font-bold text-xs text-zinc-800 shadow-2xs transition-all active:scale-[0.98] hover:bg-zinc-50 cursor-pointer hover:border-zinc-300"
              >
                {googleBusy ? (
                  <Loader2 className="size-4 animate-spin text-zinc-600" />
                ) : (
                  <>
                    <GoogleGlyph />
                    <span>{lang === "hi" ? "Google के साथ आगे बढ़ें" : "Continue with Google"}</span>
                  </>
                )}
              </button>
            </form>

            {/* Registration / Login Mode Switch Link */}
            <div className="mt-5 pt-4 border-t border-zinc-100 text-center">
              {authMode === "login" ? (
                <p className="text-xs text-zinc-500 font-medium">
                  {lang === "hi" ? "नया पार्टनर स्टोर शुरू करना चाहते हैं?" : "Don't have a Partner account?"}{" "}
                  <button
                    type="button"
                    onClick={() => {
                      setAuthMode("register");
                      setError(null);
                      setNotRegistered(false);
                      setAlreadyRegistered(false);
                    }}
                    className="font-black text-primary hover:text-primary-dark hover:underline block sm:inline mt-1 sm:mt-0 cursor-pointer"
                  >
                    {lang === "hi" ? "यहाँ नया पंजीकरण करें →" : "Become a QuickPress Partner →"}
                  </button>
                </p>
              ) : (
                <p className="text-xs text-zinc-500 font-medium">
                  {lang === "hi" ? "पहले से पार्टनर स्टोर पंजीकृत है?" : "Already registered your store?"}{" "}
                  <button
                    type="button"
                    onClick={() => {
                      setAuthMode("login");
                      setError(null);
                      setNotRegistered(false);
                      setAlreadyRegistered(false);
                    }}
                    className="font-black text-primary hover:text-primary-dark hover:underline block sm:inline mt-1 sm:mt-0 cursor-pointer"
                  >
                    {lang === "hi" ? "यहाँ लॉगिन करें →" : "Sign in to your account →"}
                  </button>
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Bottom Security Footer */}
        <div className="py-2 text-center">
          <p className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-zinc-500">
            <ShieldCheck className="size-3.5 text-primary" />
            <span>
              {lang === "hi"
                ? "सुरक्षित 256-बिट एन्क्रिप्टेड पार्टनर पोर्टल"
                : "Secure 256-bit Encrypted Partner Portal"}
            </span>
          </p>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* DESKTOP EXPERIENCE (>= 1024px)                                            */}
      {/* ========================================================================= */}
      <div className="hidden lg:flex min-h-screen w-full flex-col justify-between p-8 xl:p-12 relative z-10 max-w-7xl mx-auto">
        {/* Top Desktop Bar */}
        <header className="flex items-center justify-between pb-6">
          <PartnerAuthHeader badge="PARTNER PANEL" withTagline={true} />

          {/* Top Right Controls */}
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => setLang(lang === "en" ? "hi" : "en")}
              className="flex items-center gap-2 rounded-2xl border border-zinc-200 bg-white px-4 py-2 text-xs font-bold text-zinc-700 shadow-2xs hover:bg-zinc-50 active:scale-95 transition-all cursor-pointer"
            >
              <Globe className="size-4 text-zinc-500" />
              <span>Language: {lang === "en" ? "English" : "हिंदी"}</span>
            </button>

            <a
              href="tel:18002008899"
              className="flex items-center gap-1.5 text-xs font-bold text-zinc-600 hover:text-zinc-900"
            >
              <Headphones className="size-4 text-primary" />
              <span>Help: 1800-200-8899</span>
            </a>
          </div>
        </header>

        {/* Main Two-Column Split Layout */}
        <main className="my-auto py-8 grid grid-cols-12 gap-10 xl:gap-16 items-center">
          {/* ===================================================================== */}
          {/* LEFT MARKETING & BRAND SECTION (~45% / 6 Cols)                        */}
          {/* ===================================================================== */}
          <section className="col-span-6 xl:col-span-6 pr-4 space-y-6">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-amber-100/80 px-3 py-1 text-xs font-black text-amber-900 border border-amber-300/80 mb-4">
                <Sparkles className="size-3.5 text-amber-600" />
                <span>GROW WITH QUICKPRESS</span>
              </div>
              <h2 className="text-4xl xl:text-5xl font-black leading-[1.15] tracking-tight text-[#111827]">
                Grow Your Laundry Business With QuickPress
              </h2>
              <p className="mt-4 text-base font-medium text-zinc-600 leading-relaxed max-w-lg">
                Manage orders, services, customers and earnings from one powerful, business-focused platform.
              </p>
            </div>

            {/* 4 Premium Benefit Cards */}
            <div className="grid grid-cols-2 gap-3.5 pt-2">
              {BENEFIT_CARDS.map((card) => (
                <div
                  key={card.title}
                  className="rounded-2xl border border-zinc-200/90 bg-white/90 p-4 shadow-2xs backdrop-blur-xs transition-all hover:border-zinc-300 hover:shadow-sm"
                >
                  <div className={`flex size-9 items-center justify-center rounded-xl ${card.color} mb-3`}>
                    <card.icon className="size-4.5" />
                  </div>
                  <h3 className="text-xs font-black text-[#111827]">{card.title}</h3>
                  <p className="mt-1 text-[11px] font-medium text-zinc-500 leading-normal">
                    {card.desc}
                  </p>
                </div>
              ))}
            </div>

            {/* Bottom Left Trust Guarantee */}
            <div className="flex items-center gap-3 pt-2 border-t border-zinc-200/80">
              <div className="flex size-10 items-center justify-center rounded-2xl bg-primary/10 text-primary shrink-0 border border-primary/20">
                <ShieldCheck className="size-5" />
              </div>
              <div>
                <p className="text-xs font-black text-[#111827]">Secure & Trusted Platform</p>
                <p className="text-[11px] font-medium text-zinc-500">
                  Your business data is protected with 256-bit encrypted authentication.
                </p>
              </div>
            </div>
          </section>

          {/* ===================================================================== */}
          {/* RIGHT LOGIN CARD SECTION (~55% / 6 Cols)                              */}
          {/* ===================================================================== */}
          <section className="col-span-6 xl:col-span-6 flex justify-end">
            <div className="w-full max-w-lg rounded-3xl border border-zinc-200/90 bg-white p-8 xl:p-10 shadow-lg relative">
              {/* Mode Switcher: Login vs Register (Desktop) */}
              <div className="flex items-center p-1 bg-zinc-100 rounded-2xl mb-6 border border-zinc-200/80">
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode("login");
                    setError(null);
                    setNotRegistered(false);
                    setAlreadyRegistered(false);
                  }}
                  className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-black transition-all cursor-pointer ${
                    authMode === "login"
                      ? "bg-white text-zinc-950 shadow-xs border border-zinc-200/60"
                      : "text-zinc-500 hover:text-zinc-900"
                  }`}
                >
                  <LogIn className="w-4 h-4 text-primary" />
                  <span>{lang === "hi" ? "पार्टनर लॉगिन" : "Partner Login"}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setAuthMode("register");
                    setError(null);
                    setNotRegistered(false);
                    setAlreadyRegistered(false);
                  }}
                  className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-black transition-all cursor-pointer ${
                    authMode === "register"
                      ? "bg-white text-zinc-950 shadow-xs border border-zinc-200/60"
                      : "text-zinc-500 hover:text-zinc-900"
                  }`}
                >
                  <Store className="w-4 h-4 text-emerald-600" />
                  <span>{lang === "hi" ? "नया पंजीकरण" : "New Registration"}</span>
                </button>
              </div>

              {/* Card Header */}
              <div className="mb-6">
                <span className="text-sm font-bold text-zinc-500">
                  {authMode === "login" ? "Welcome Back 👋" : "Join QuickPress Fleet 🏪"}
                </span>
                <h3 className="mt-1 text-2xl font-black tracking-tight text-[#111827]">
                  {authMode === "login"
                    ? lang === "hi"
                      ? "पार्टनर लॉगिन"
                      : "Partner Login"
                    : lang === "hi"
                    ? "नया पार्टनर स्टोर पंजीकरण"
                    : "Register New Partner Store"}
                </h3>
                <p className="mt-1 text-xs font-medium text-zinc-500">
                  {authMode === "login"
                    ? lang === "hi"
                      ? "अपने पंजीकृत मोबाइल नंबर के साथ स्टोर पोर्टल में प्रवेश करें।"
                      : "Manage your laundry business with QuickPress."
                    : lang === "hi"
                    ? "अपने स्टोर को ऑनलाइन जोड़ें और दैनिक ऑर्डर्स प्राप्त करें।"
                    : "Register your laundry business and connect with customers."}
                </p>
              </div>

              {/* Login Form */}
              <form onSubmit={handleContinue} className="space-y-4">
                <div>
                  <label
                    htmlFor="mobile-input-desk"
                    className="block text-xs font-black uppercase tracking-wider text-zinc-700 mb-2"
                  >
                    {lang === "hi" ? "मोबाइल नंबर" : "Mobile Number"}
                  </label>
                  <div
                    className={`flex h-14 items-center rounded-2xl border-2 bg-zinc-50/70 px-4 transition-all ${
                      error
                        ? "border-red-500 bg-red-50/20"
                        : "border-zinc-200 focus-within:border-primary focus-within:bg-white"
                    }`}
                  >
                    <span className="flex items-center gap-2 border-r border-zinc-200 pr-3.5 text-sm font-black text-[#111827]">
                      <span>🇮🇳</span>
                      <span>+91</span>
                    </span>
                    <input
                      id="mobile-input-desk"
                      type="tel"
                      inputMode="numeric"
                      autoComplete="tel-national"
                      maxLength={10}
                      value={value}
                      onChange={(e) => {
                        setValue(e.target.value.replace(/\D/g, "").slice(0, 10));
                        if (error) {
                          setError(null);
                          setNotRegistered(false);
                          setAlreadyRegistered(false);
                        }
                      }}
                      placeholder={lang === "hi" ? "10 अंकों का मोबाइल नंबर दर्ज करें" : "Enter mobile number"}
                      className="w-full bg-transparent pl-3.5 text-base font-black tracking-wider text-[#111827] placeholder:text-zinc-400 placeholder:font-medium placeholder:text-xs focus:outline-none"
                    />
                    {value.length > 0 && (
                      <button
                        type="button"
                        onClick={clearPhone}
                        className="flex items-center justify-center w-5 h-5 rounded-full bg-zinc-200 hover:bg-zinc-300 text-zinc-600 shrink-0 cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Desktop Interactive Error / Alert */}
                  {error && notRegistered ? (
                    <div className="mt-3 p-3.5 rounded-2xl bg-amber-50 border border-amber-200/90 text-amber-950 space-y-2 animate-in fade-in duration-200">
                      <div className="flex items-start gap-2.5">
                        <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                        <p className="text-xs font-bold leading-snug">{error}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setAuthMode("register");
                          setError(null);
                          setNotRegistered(false);
                        }}
                        className="w-full flex items-center justify-center gap-1.5 py-2.5 px-4 rounded-xl bg-amber-600 text-white font-black text-xs hover:bg-amber-700 transition-colors shadow-2xs cursor-pointer"
                      >
                        <span>{lang === "hi" ? "नया पार्टनर पंजीकरण करें →" : "Register as New Partner Store →"}</span>
                      </button>
                    </div>
                  ) : error && alreadyRegistered ? (
                    <div className="mt-3 p-3.5 rounded-2xl bg-blue-50 border border-blue-200/90 text-blue-950 space-y-2 animate-in fade-in duration-200">
                      <div className="flex items-start gap-2.5">
                        <AlertCircle className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                        <p className="text-xs font-bold leading-snug">{error}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setAuthMode("login");
                          setError(null);
                          setAlreadyRegistered(false);
                        }}
                        className="w-full flex items-center justify-center gap-1.5 py-2.5 px-4 rounded-xl bg-primary text-white font-black text-xs hover:bg-primary-dark transition-colors shadow-2xs cursor-pointer"
                      >
                        <span>{lang === "hi" ? "पार्टनर लॉगिन पर जाएं →" : "Switch to Partner Login →"}</span>
                      </button>
                    </div>
                  ) : error ? (
                    <p className="mt-1.5 text-xs font-bold text-red-600 animate-in fade-in duration-200">
                      {error}
                    </p>
                  ) : null}
                </div>

                {/* Primary CTA */}
                <button
                  type="submit"
                  disabled={busy || sent || value.length < 10}
                  className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-primary hover:bg-primary-dark text-white font-black text-sm uppercase tracking-wider shadow-md shadow-primary/20 transition-all hover:brightness-105 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
                >
                  {busy ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      <span>{lang === "hi" ? "सत्यापित कर रहे हैं..." : "Verifying & Sending OTP..."}</span>
                    </>
                  ) : (
                    <>
                      <span>
                        {authMode === "login"
                          ? lang === "hi"
                            ? "OTP से लॉगिन करें →"
                            : "Login with OTP →"
                          : lang === "hi"
                          ? "OTP से रजिस्टर करें →"
                          : "Register with OTP →"}
                      </span>
                    </>
                  )}
                </button>

                {/* OR Divider */}
                <div className="relative my-4 text-center">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-zinc-200" />
                  </div>
                  <span className="relative bg-white px-4 text-xs font-bold text-zinc-400 uppercase tracking-widest">
                    {lang === "hi" ? "या" : "OR"}
                  </span>
                </div>

                {/* Google Sign In */}
                <button
                  type="button"
                  onClick={handleGoogle}
                  disabled={googleBusy}
                  className="flex h-13 w-full items-center justify-center gap-3 rounded-2xl border border-zinc-200 bg-white font-bold text-xs text-zinc-800 shadow-2xs transition-all hover:bg-zinc-50 active:scale-[0.98] cursor-pointer"
                >
                  {googleBusy ? (
                    <Loader2 className="size-4 animate-spin text-zinc-600" />
                  ) : (
                    <>
                      <GoogleGlyph />
                      <span>{lang === "hi" ? "Google के साथ आगे बढ़ें" : "Continue with Google"}</span>
                    </>
                  )}
                </button>

                {/* Statutory Clickwrap Legal Notice */}
                <p className="mt-4 text-center text-[11.5px] leading-relaxed text-zinc-500">
                  By continuing, you acknowledge our{" "}
                  <Link
                    to="/legal/$docSlug"
                    params={{ docSlug: "privacy-policy" }}
                    className="font-bold text-zinc-800 underline hover:text-primary transition-colors cursor-pointer"
                  >
                    Privacy Policy
                  </Link>{" "}
                  and agree to the{" "}
                  <Link
                    to="/legal/$docSlug"
                    params={{ docSlug: "partner-agreement" }}
                    className="font-bold text-zinc-800 underline hover:text-primary transition-colors cursor-pointer"
                  >
                    Partner Terms & SLA
                  </Link>.
                </p>
              </form>

              {/* Registration / Login Mode Switch Link */}
              <div className="mt-8 pt-6 border-t border-zinc-100 text-center">
                {authMode === "login" ? (
                  <p className="text-xs text-zinc-600 font-medium">
                    {lang === "hi" ? "नया पार्टनर स्टोर शुरू करना चाहते हैं?" : "Don't have a Partner account?"}{" "}
                    <button
                      type="button"
                      onClick={() => {
                        setAuthMode("register");
                        setError(null);
                        setNotRegistered(false);
                        setAlreadyRegistered(false);
                      }}
                      className="font-black text-primary hover:text-primary-dark hover:underline cursor-pointer ml-1"
                    >
                      {lang === "hi" ? "यहाँ नया पंजीकरण करें →" : "Become a QuickPress Partner"}
                    </button>
                  </p>
                ) : (
                  <p className="text-xs text-zinc-600 font-medium">
                    {lang === "hi" ? "पहले से पार्टनर स्टोर पंजीकृत है?" : "Already registered your store?"}{" "}
                    <button
                      type="button"
                      onClick={() => {
                        setAuthMode("login");
                        setError(null);
                        setNotRegistered(false);
                        setAlreadyRegistered(false);
                      }}
                      className="font-black text-primary hover:text-primary-dark hover:underline cursor-pointer ml-1"
                    >
                      {lang === "hi" ? "यहाँ लॉगिन करें →" : "Sign in to your account"}
                    </button>
                  </p>
                )}
              </div>

              {/* Security Section Below Card */}
              <div className="mt-5 pt-3 border-t border-dashed border-zinc-200/80 text-center">
                <p className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-zinc-500">
                  <ShieldCheck className="size-3.5 text-primary" />
                  <span>
                    {lang === "hi"
                      ? "🔒 सुरक्षित पार्टनर एक्सेस · आपका व्यावसायिक डेटा सुरक्षित है"
                      : "🔒 Secure Partner Access · Your business data is protected"}
                  </span>
                </p>
              </div>
            </div>
          </section>
        </main>

        {/* Desktop Footer */}
        <footer className="flex items-center justify-between border-t border-zinc-200/80 pt-6 text-xs text-zinc-500">
          <span>© 2026 QuickPress Technologies Inc. All rights reserved.</span>
          <div className="flex items-center gap-6">
            <Link
              to="/legal/$docSlug"
              params={{ docSlug: "partner-agreement" }}
              className="hover:underline cursor-pointer"
            >
              Partner Terms
            </Link>
            <Link
              to="/legal/$docSlug"
              params={{ docSlug: "privacy-policy" }}
              className="hover:underline cursor-pointer"
            >
              Privacy Policy
            </Link>
            <Link
              to="/legal/$docSlug"
              params={{ docSlug: "grievance-redressal" }}
              className="hover:underline cursor-pointer"
            >
              Grievance Desk
            </Link>
          </div>
        </footer>
      </div>

      <Toaster />
    </div>
  );
}
