import React, { useState } from "react";
import { Check, Globe, HelpCircle, Sparkles, X } from "lucide-react";
import { SUPPORTED_LANGUAGES, type LanguageCode, useLanguage } from "../../lib/i18n";

interface LanguageSelectionModalProps {
  isOpen?: boolean;
  onClose?: () => void;
  canDismiss?: boolean;
}

export function LanguageSelectionModal({
  isOpen: forcedIsOpen,
  onClose: customOnClose,
  canDismiss = true,
}: LanguageSelectionModalProps) {
  const { language, setLanguage, isLanguageModalOpen, closeLanguageModal } = useLanguage();

  const isOpen = forcedIsOpen !== undefined ? forcedIsOpen : isLanguageModalOpen;
  const handleClose = customOnClose || closeLanguageModal;

  const [mounted, setMounted] = useState(false);
  const [selectedLang, setSelectedLang] = useState<LanguageCode>(language);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  React.useEffect(() => {
    if (isOpen) {
      setSelectedLang(language);
    }
  }, [isOpen, language]);

  if (!mounted || !isOpen) return null;

  const handleConfirm = () => {
    setLanguage(selectedLang);
    handleClose();
  };

  return (
    <div className="fixed inset-0 z-[99999] flex flex-col justify-between overflow-hidden bg-[#0A192F] text-white font-sans animate-fade-in select-none">
      {/* ----------------- TOP HERO SECTION WITH TRANSLATION BADGES & GLOW ----------------- */}
      <div className="relative flex-1 flex flex-col items-center justify-center px-6 pt-10 pb-6 overflow-hidden">
        {/* Ambient Glows */}
        <div className="pointer-events-none absolute -top-24 -left-24 size-80 rounded-full bg-blue-500/20 blur-3xl animate-pulse" />
        <div className="pointer-events-none absolute top-1/3 -right-24 size-80 rounded-full bg-emerald-500/20 blur-3xl" />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-[#0A192F] via-[#0D2140]/90 to-[#0A192F]" />

        {/* Top Bar Actions: Help & Optional Close */}
        <div className="absolute top-6 left-0 right-0 px-6 flex items-center justify-between z-20">
          <div className="flex items-center gap-2">
            <span className="flex size-7 items-center justify-center rounded-lg bg-white/10 text-amber-400 backdrop-blur-md">
              <Globe className="size-4 animate-spin-slow" />
            </span>
            <span className="text-xs font-black tracking-wider uppercase text-zinc-300">QuickPress</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => alert("QuickPress 24x7 Partner Support: 1800-889-QUICK")}
              className="flex items-center gap-1.5 rounded-full bg-white/10 hover:bg-white/20 border border-white/15 px-3 py-1.5 text-xs font-bold text-white backdrop-blur-md transition-all active:scale-95 cursor-pointer shadow-sm"
            >
              <HelpCircle className="size-3.5 text-sky-400" />
              <span>Help</span>
            </button>

            {canDismiss && (
              <button
                type="button"
                onClick={handleClose}
                className="flex size-8 items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white/80 hover:text-white transition-all cursor-pointer"
              >
                <X className="size-4" />
              </button>
            )}
          </div>
        </div>

        {/* Floating Language Badges with Glassmorphism */}
        <div className="relative z-10 flex items-center justify-center mt-6">
          {/* Sparkles Particle Accents */}
          <Sparkles className="absolute -top-6 left-8 size-4 text-amber-300/80 animate-pulse" />
          <Sparkles className="absolute bottom-2 right-6 size-3.5 text-emerald-300/80 animate-ping" />

          {/* Left Bubble ("आ" / Hindi) */}
          <div className="relative z-10 flex size-24 items-center justify-center rounded-3xl bg-gradient-to-br from-white/20 to-white/5 border border-white/20 shadow-2xl backdrop-blur-xl -mr-4 transform -rotate-6 transition-transform hover:scale-105">
            <span className="text-4xl font-black text-white drop-shadow-md">आ</span>
          </div>

          {/* Right Bubble ("A" / English) */}
          <div className="relative z-20 flex size-28 items-center justify-center rounded-3xl bg-gradient-to-br from-white/30 to-white/10 border border-white/30 shadow-2xl backdrop-blur-2xl transform rotate-6 transition-transform hover:scale-105">
            <span className="text-5xl font-black text-white drop-shadow-lg">A</span>
            <div className="absolute -top-2 -right-2 size-3.5 rounded-full bg-emerald-400 animate-ping" />
          </div>
        </div>
      </div>

      {/* ----------------- BOTTOM SHEET LANGUAGE SELECTION CARD ----------------- */}
      <div className="relative z-30 bg-white text-zinc-900 rounded-t-[2.5rem] px-5 pt-6 pb-8 shadow-2xl border-t border-zinc-100 animate-slide-in-up max-h-[62vh] flex flex-col justify-between">
        {/* Header Title */}
        <div className="text-center mb-4">
          <div className="mx-auto w-10 h-1 rounded-full bg-zinc-200 mb-3" />
          <h3 className="text-lg font-black tracking-tight text-zinc-900">Select App Language</h3>
          <p className="text-xs font-semibold text-zinc-500 mt-0.5">
            अपनी पसंदीदा भाषा चुनें / Choose your language
          </p>
        </div>

        {/* Language Grid (2 Columns) */}
        <div className="overflow-y-auto max-h-[38vh] pr-1 grid grid-cols-2 gap-2.5 my-2">
          {SUPPORTED_LANGUAGES.map((lang) => {
            const isSelected = selectedLang === lang.code;

            return (
              <button
                key={lang.code}
                type="button"
                onClick={() => setSelectedLang(lang.code)}
                className={`relative flex items-center justify-between p-3.5 rounded-2xl border text-left transition-all cursor-pointer active:scale-[0.98] ${
                  isSelected
                    ? "border-amber-400 bg-amber-50/70 shadow-sm ring-2 ring-amber-300/60"
                    : "border-zinc-200/90 bg-white hover:border-zinc-300 hover:bg-zinc-50/50"
                }`}
              >
                <div className="min-w-0 pr-2">
                  <div className="text-sm font-black text-zinc-900 truncate">{lang.nativeName}</div>
                  <div className="text-[10px] font-semibold text-zinc-500 truncate mt-0.5">{lang.englishName}</div>
                </div>

                {/* Radio Selection Indicator */}
                <div
                  className={`flex size-6 shrink-0 items-center justify-center rounded-full border-2 transition-all ${
                    isSelected ? "border-amber-500 bg-amber-400 text-black shadow-xs" : "border-zinc-300 bg-white"
                  }`}
                >
                  {isSelected && <Check className="size-3.5 stroke-[3.5]" />}
                </div>
              </button>
            );
          })}
        </div>

        {/* Floating Confirm Button */}
        <div className="pt-3">
          <button
            type="button"
            onClick={handleConfirm}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#0A192F] hover:bg-[#112240] py-3.5 text-sm font-black text-white shadow-lg active:scale-[0.98] transition-all cursor-pointer"
          >
            <span>Confirm & Continue</span>
            <span className="text-xs text-amber-400 font-bold">
              ({SUPPORTED_LANGUAGES.find((l) => l.code === selectedLang)?.nativeName})
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
