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
  const displaySubtitle = subtitle || hint || "Ask 4-digit code from customer (कस्टमर से कोड पूछें)";

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
    <div className={`rounded-2xl border-2 p-4 shadow-sm space-y-3 transition-all ${
      isAutoSubmitting || isComplete
        ? "border-emerald-500 bg-gradient-to-br from-emerald-100/90 via-emerald-50 to-teal-50 ring-2 ring-emerald-400/40"
        : "border-emerald-500/40 bg-gradient-to-br from-emerald-50/90 via-white to-teal-50/70"
    }`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={`flex size-7.5 items-center justify-center rounded-xl text-white shadow-xs transition-colors ${
            isAutoSubmitting ? "bg-emerald-600 animate-bounce" : "bg-emerald-600"
          }`}>
            <KeyRound className="size-4" />
          </span>
          <div>
            <h4 className="text-xs font-black uppercase tracking-wider text-emerald-950 block">
              {title}
            </h4>
            <p className="text-[11px] font-semibold text-emerald-700">
              {displaySubtitle}
            </p>
          </div>
        </div>

        <span className="rounded-full bg-emerald-600/15 px-2.5 py-0.5 text-[10px] font-black text-emerald-800 border border-emerald-500/30">
          Required OTP
        </span>
      </div>

      {/* 4 Digit Boxes */}
      <div className="flex justify-center gap-2.5 sm:gap-3 py-1">
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
            className={`w-13 h-14 sm:w-14 sm:h-15 text-center font-mono text-2xl font-black rounded-2xl border-2 transition-all shadow-xs ${
              digit
                ? "border-emerald-600 bg-white text-emerald-950 ring-2 ring-emerald-500/30 scale-105"
                : "border-zinc-300 bg-zinc-50/80 text-zinc-900 focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            }`}
            placeholder="•"
          />
        ))}
      </div>

      {/* Auto-Submitting Visual Notification */}
      {isAutoSubmitting ? (
        <div className="flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-xl bg-emerald-600 text-white text-xs font-black animate-pulse shadow-sm">
          <CheckCircle2 className="w-4 h-4" />
          <span>✓ OTP Verified! Auto-Accepting Trip... (ऑटो सबमिट हो रहा है)</span>
        </div>
      ) : (
        <div className="flex items-center justify-between pt-1 border-t border-emerald-500/10 text-[10.5px] font-medium text-zinc-600">
          <span className="flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-emerald-600" />
            <span>4 अंक दर्ज होते ही बिना बटन दबाए ऑटो एक्सेप्ट होगा</span>
          </span>
          {currentDigits.some((d) => d) && (
            <button
              type="button"
              onClick={() => {
                updateDigits(["", "", "", ""]);
                inputRefs[0].current?.focus();
              }}
              className="font-bold text-rose-600 hover:underline"
            >
              Clear
            </button>
          )}
        </div>
      )}
    </div>
  );
};

interface RiderStoreDispatchDisplayProps {
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
    <div className="rounded-2xl border-2 border-emerald-500/50 bg-gradient-to-br from-emerald-600 to-teal-700 text-white p-4 shadow-md space-y-3.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="flex size-8 items-center justify-center rounded-xl bg-white/20 text-white border border-white/30">
            <ShieldCheck className="size-4.5" />
          </span>
          <div>
            <span className="text-[10px] font-black uppercase tracking-widest text-emerald-200 block">
              Store Handover Dispatch Code
            </span>
            <h4 className="text-xs font-black text-white">
              Tell this 4-Digit Code to Store Partner
            </h4>
          </div>
        </div>
        <span className="rounded-full bg-white/20 border border-white/30 px-2.5 py-0.5 text-[10px] font-black text-white">
          Handshake
        </span>
      </div>

      <p className="text-[11.5px] text-emerald-100 font-medium leading-snug">
        You are at <b>{storeName}</b>. Speak this code aloud to store staff to release the packed order:
      </p>

      {/* Giant 4 Digit Card Display */}
      <div className="flex justify-center items-center gap-2.5 sm:gap-3 py-1">
        {cleanCode.split("").map((digit, idx) => (
          <div
            key={idx}
            className="w-13 h-14 sm:w-14 sm:h-15 flex items-center justify-center rounded-2xl bg-white text-emerald-950 font-mono text-2xl sm:text-3xl font-black shadow-lg border-2 border-white/80"
          >
            {digit}
          </div>
        ))}
      </div>

      {/* Action Buttons: Speak Out & Copy */}
      <div className="flex items-center justify-center gap-2 pt-1">
        <button
          type="button"
          onClick={handleSpeak}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/20 hover:bg-white/30 border border-white/30 text-xs font-black text-white active:scale-95 transition-all shadow-xs"
        >
          <Volume2 className="size-3.5" />
          <span>Speak Code (बोलकर बताएं)</span>
        </button>
        <button
          type="button"
          onClick={handleCopy}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/20 hover:bg-white/30 border border-white/30 text-xs font-black text-white active:scale-95 transition-all shadow-xs"
        >
          <Copy className="size-3.5" />
          <span>Copy</span>
        </button>
      </div>

      {storeAddress && (
        <div className="p-2 rounded-xl bg-black/20 border border-white/10 text-[10.5px] text-emerald-100 flex items-center justify-between">
          <span className="truncate">📍 {storeAddress}</span>
        </div>
      )}
    </div>
  );
};
