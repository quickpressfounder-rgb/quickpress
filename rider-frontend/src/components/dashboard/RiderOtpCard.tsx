import React, { useEffect, useRef, useState } from "react";
import { Copy, KeyRound, ShieldCheck, Volume2, CheckCircle2, Zap, ClipboardCheck, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { speakText, triggerHaptic } from "../../lib/captain-audio";

export interface RiderCustomerOtpInputProps {
  digits?: string[];
  otpDigits?: string[];
  onChange?: (digits: string[]) => void;
  setOtpDigits?: (digits: string[]) => void;
  title?: string;
  subtitle?: string;
  hint?: string;
  autoFillCode?: string;
  onAutoSubmit?: (code: string) => void;
  disabled?: boolean;
}

export const RiderCustomerOtpInput: React.FC<RiderCustomerOtpInputProps> = ({
  digits,
  otpDigits,
  onChange,
  setOtpDigits,
  title = "Customer Verification OTP",
  subtitle,
  hint,
  autoFillCode,
  onAutoSubmit,
  disabled = false,
}) => {
  const currentDigits = digits || otpDigits || ["", "", "", ""];
  const displaySubtitle = subtitle || hint || "Ask 4-digit PIN from customer (कस्टमर से 4-अंक का पिन पूछें)";

  const [isAutoSubmitting, setIsAutoSubmitting] = useState(false);

  const inputRefs = [
    useRef<HTMLInputElement | null>(null),
    useRef<HTMLInputElement | null>(null),
    useRef<HTMLInputElement | null>(null),
    useRef<HTMLInputElement | null>(null),
  ];

  const updateDigits = (nextDigits: string[]) => {
    if (onChange) onChange(nextDigits);
    if (setOtpDigits) setOtpDigits(nextDigits);
  };

  const triggerAutoAccept = (code: string) => {
    if (code.length === 4 && onAutoSubmit) {
      setIsAutoSubmitting(true);
      triggerHaptic([40, 60, 40]);
      setTimeout(() => {
        onAutoSubmit(code);
        setTimeout(() => setIsAutoSubmitting(false), 1200);
      }, 250);
    }
  };

  // Web OTP API (SMS Auto-detection on mobile devices)
  useEffect(() => {
    if (typeof window !== "undefined" && "OTPCredential" in window) {
      const ac = new AbortController();
      (navigator.credentials as any)
        ?.get({
          otp: { transport: ["sms"] },
          signal: ac.signal,
        })
        .then((content: any) => {
          if (content && content.code) {
            const clean = content.code.replace(/\D/g, "").slice(0, 4);
            if (clean.length === 4) {
              const spl = clean.split("");
              updateDigits(spl);
              toast.success(`⚡ SMS OTP Auto-detected: ${clean}`);
              triggerAutoAccept(clean);
            }
          }
        })
        .catch(() => {});

      return () => {
        ac.abort();
      };
    }
  }, []);

  const handleDigitChange = (index: number, val: string) => {
    const clean = val.replace(/\D/g, "").slice(-1);
    const next = [...currentDigits];
    next[index] = clean;
    updateDigits(next);

    if (clean && index < 3) {
      inputRefs[index + 1].current?.focus();
    }

    // Auto-accept immediately when 4th digit is entered
    if (clean && next.every((d) => d.length === 1)) {
      const fullCode = next.join("");
      triggerAutoAccept(fullCode);
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !currentDigits[index] && index > 0) {
      inputRefs[index - 1].current?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasteData = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 4);
    if (pasteData.length > 0) {
      const next = ["", "", "", ""];
      for (let i = 0; i < pasteData.length; i++) {
        next[i] = pasteData[i];
      }
      updateDigits(next);
      if (pasteData.length === 4) {
        inputRefs[3].current?.focus();
        triggerAutoAccept(pasteData);
      } else {
        inputRefs[Math.min(3, pasteData.length)].current?.focus();
      }
    }
  };

  const isComplete = currentDigits.every((d) => d.length === 1);

  return (
    <div
      className={`rounded-3xl border-2 p-4.5 shadow-xl space-y-3.5 transition-all duration-300 ${
        isAutoSubmitting || isComplete
          ? "border-emerald-500 bg-gradient-to-br from-emerald-950/20 via-emerald-50/90 to-teal-50/90 ring-4 ring-emerald-500/20 shadow-emerald-500/10"
          : "border-slate-200/90 bg-white/95 backdrop-blur-md shadow-slate-200/50"
      }`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span
            className={`flex size-9 items-center justify-center rounded-2xl text-white shadow-md transition-all ${
              isAutoSubmitting ? "bg-emerald-600 animate-bounce scale-110" : "bg-gradient-to-br from-emerald-500 to-teal-600"
            }`}
          >
            <KeyRound className="size-5" />
          </span>
          <div>
            <h4 className="text-xs sm:text-[13px] font-black uppercase tracking-wider text-slate-900 block leading-tight">
              {title}
            </h4>
            <p className="text-[11px] font-bold text-emerald-700 leading-tight mt-0.5">
              {displaySubtitle}
            </p>
          </div>
        </div>

        <span className="rounded-full bg-emerald-500/15 px-3 py-1 text-[10px] font-black uppercase tracking-wide text-emerald-800 border border-emerald-500/30 flex items-center gap-1">
          <span className="size-1.5 rounded-full bg-emerald-600 animate-pulse" />
          <span>Security OTP</span>
        </span>
      </div>

      {/* 4 Digit Boxes */}
      <div className="flex justify-center gap-2.5 sm:gap-3.5 py-1.5">
        {currentDigits.map((digit, idx) => (
          <input
            key={idx}
            ref={inputRefs[idx]}
            type="tel"
            inputMode="numeric"
            maxLength={1}
            disabled={disabled}
            value={digit}
            onChange={(e) => handleDigitChange(idx, e.target.value)}
            onKeyDown={(e) => handleKeyDown(idx, e)}
            onPaste={handlePaste}
            className={`w-14 h-16 sm:w-16 sm:h-18 text-center font-mono text-3xl font-black rounded-2xl border-2 transition-all duration-200 shadow-sm ${
              digit
                ? "border-emerald-500 bg-emerald-50/80 text-emerald-950 ring-4 ring-emerald-500/20 scale-105 shadow-emerald-500/10"
                : "border-slate-200 bg-slate-50 text-slate-900 focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-emerald-500/20"
            }`}
            placeholder="—"
          />
        ))}
      </div>

      {/* Auto-Submitting Visual Notification */}
      {isAutoSubmitting ? (
        <div className="flex items-center justify-center gap-2 py-2 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white text-xs font-black animate-pulse shadow-md">
          <CheckCircle2 className="size-4.5" />
          <span>✓ OTP Verified! Completing Trip...</span>
        </div>
      ) : (
        <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-[11px] font-semibold text-slate-600">
          <span className="flex items-center gap-1.5">
            <Sparkles className="size-3.5 text-emerald-600" />
            <span>4 अंक दर्ज करते ही ऑटो-वेरीफाई होगा</span>
          </span>
          {currentDigits.some((d) => d) && (
            <button
              type="button"
              onClick={() => {
                updateDigits(["", "", "", ""]);
                inputRefs[0].current?.focus();
              }}
              className="font-bold text-rose-600 hover:text-rose-700 hover:underline px-2 py-0.5"
            >
              Clear
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export interface RiderStoreDispatchDisplayProps {
  code?: string;
  dispatchOtp?: string;
  storeName: string;
  storeAddress?: string;
  onCopy?: () => void;
  onSpeak?: () => void;
  onCheckStatus?: () => void;
  isChecking?: boolean;
}

export const RiderStoreDispatchDisplay: React.FC<RiderStoreDispatchDisplayProps> = ({
  code,
  dispatchOtp,
  storeName,
  storeAddress,
  onCopy,
  onSpeak,
  onCheckStatus,
  isChecking = false,
}) => {
  const activeCode = code || dispatchOtp || "----";
  const cleanCode = activeCode.padEnd(4, "-").slice(0, 4);

  const handleCopy = () => {
    if (onCopy) {
      onCopy();
      return;
    }
    if (activeCode && activeCode !== "----") {
      navigator.clipboard?.writeText(activeCode);
      toast.success("Dispatch OTP copied to clipboard!");
      triggerHaptic(40);
    }
  };

  const handleSpeak = () => {
    if (onSpeak) {
      onSpeak();
      return;
    }
    if (activeCode && activeCode !== "----") {
      const spaced = activeCode.split("").join(" ");
      speakText(`डिस्पैच कोड है: ${spaced}`);
      triggerHaptic(50);
    }
  };

  return (
    <div className="rounded-3xl border-2 border-slate-900 bg-slate-950 text-white p-4.5 shadow-2xl space-y-3.5 relative overflow-hidden">
      {/* Background glow accent */}
      <div className="absolute top-0 right-0 -mr-10 -mt-10 size-32 rounded-full bg-emerald-500/10 blur-2xl pointer-events-none" />

      {/* Header Row */}
      <div className="flex items-center justify-between relative z-10">
        <div className="flex items-center gap-2.5">
          <span className="flex size-9 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-500 text-slate-950 font-black shadow-lg shrink-0">
            <ShieldCheck className="size-5" />
          </span>
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400 block leading-tight">
              Store Handshake Verification
            </span>
            <h4 className="text-xs sm:text-[13px] font-black text-white leading-tight mt-0.5">
              Tell this 4-Digit Code to Store Partner
            </h4>
          </div>
        </div>
        <span className="rounded-full bg-emerald-500/20 border border-emerald-400/40 px-2.5 py-1 text-[10px] font-black text-emerald-300">
          HANDSHAKE
        </span>
      </div>

      <p className="text-[11.5px] text-slate-300 font-medium leading-relaxed relative z-10">
        You are at <b className="text-white font-black underline decoration-emerald-400 decoration-2">{storeName}</b>.
        Speak this code aloud to store staff to release the packed laundry:
      </p>

      {/* 4 Digit Display Pills in high-contrast neon */}
      <div className="flex justify-center items-center gap-3 py-1 relative z-10">
        {cleanCode.split("").map((digit, idx) => (
          <div
            key={idx}
            className="w-13 h-15 sm:w-15 sm:h-17 flex items-center justify-center rounded-2xl bg-slate-900 text-emerald-400 font-mono text-3xl font-black shadow-xl border-2 border-emerald-500/40 shadow-emerald-500/10"
          >
            {digit}
          </div>
        ))}
      </div>

      {/* Action Buttons: Speak Out & Copy */}
      <div className="flex items-center justify-center gap-2.5 pt-1 relative z-10">
        <button
          type="button"
          onClick={handleSpeak}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-slate-950 text-xs font-black active:scale-95 transition-all shadow-lg hover:brightness-105 cursor-pointer"
        >
          <Volume2 className="size-4 text-slate-950" />
          <span>Speak Code (बोलकर बताएं)</span>
        </button>
        <button
          type="button"
          onClick={handleCopy}
          className="flex items-center justify-center gap-1.5 py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-bold text-slate-200 active:scale-95 transition-all cursor-pointer"
        >
          <Copy className="size-4 text-slate-300" />
          <span>Copy</span>
        </button>
      </div>

      {storeAddress && (
        <div className="p-2 rounded-xl bg-slate-900/90 border border-slate-800 text-[10.5px] font-medium text-slate-400 flex items-center gap-1.5 relative z-10">
          <span className="text-emerald-400 shrink-0">📍</span>
          <span className="truncate">{storeAddress}</span>
        </div>
      )}
    </div>
  );
};

