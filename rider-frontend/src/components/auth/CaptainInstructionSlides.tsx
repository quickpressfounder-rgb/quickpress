import React, { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, Clock, ShieldCheck, Sparkles, Zap } from "lucide-react";
import { useLanguage } from "../../lib/i18n";

interface CaptainInstructionSlidesProps {
  onComplete?: () => void;
  onChangeLanguage?: () => void;
}

export const CaptainInstructionSlides: React.FC<CaptainInstructionSlidesProps> = ({
  onComplete,
  onChangeLanguage,
}) => {
  const navigate = useNavigate();
  const { t, selectedLanguageObj } = useLanguage();
  const [currentSlide, setCurrentSlide] = useState(0);

  const slides = [
    {
      id: 1,
      badge: t("slides.1.badge", "0% COMMISSION"),
      title: t("slides.1.title", "Zero Commission, 100% Earnings"),
      subtitle: t(
        "slides.1.subtitle",
        "All your earnings go straight to your wallet. Zero platform deductions!"
      ),
      icon: ShieldCheck,
      highlight: t("slides.1.highlight", "Daily Direct Bank Payouts"),
      color: "emerald",
    },
    {
      id: 2,
      badge: t("slides.2.badge", "SMART DISPATCH"),
      title: t("slides.2.title", "Live Ride & Delivery Dispatches"),
      subtitle: t(
        "slides.2.subtitle",
        "Receive instant orders on your mobile with live GPS tracking."
      ),
      icon: Zap,
      highlight: t("slides.2.highlight", "High Demand in Work Zones"),
      color: "amber",
    },
    {
      id: 3,
      badge: t("slides.3.badge", "FULL FLEXIBILITY"),
      title: t("slides.3.title", "Flexible Working Hours"),
      subtitle: t(
        "slides.3.subtitle",
        "Work whenever you want. Turn ON DUTY and earn on your schedule."
      ),
      icon: Clock,
      highlight: t("slides.3.highlight", "Be Your Own Boss"),
      color: "blue",
    },
  ];

  const handleNext = () => {
    if (currentSlide < slides.length - 1) {
      setCurrentSlide((prev) => prev + 1);
    } else {
      if (onComplete) {
        onComplete();
      } else {
        navigate({ to: "/" });
      }
    }
  };

  const slide = slides[currentSlide];
  const IconComponent = slide.icon;
  const isLast = currentSlide === slides.length - 1;

  return (
    <div
      className="relative flex flex-col flex-1 w-full min-h-[100dvh] max-w-md mx-auto bg-white text-neutral-900 select-none justify-between px-6 overflow-hidden"
      style={{
        paddingTop: "max(env(safe-area-inset-top, 0px) + 12px, 18px)",
        paddingBottom: "max(env(safe-area-inset-bottom, 0px) + 12px, 18px)",
      }}
    >
      {/* 1. Top Bar: Language Switcher + Skip */}
      <div className="flex items-center justify-between">
        {onChangeLanguage ? (
          <button
            type="button"
            onClick={onChangeLanguage}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-neutral-50 hover:bg-neutral-100 border border-neutral-200 rounded-full text-xs font-black text-neutral-800 transition-colors active:scale-95"
          >
            <div className="flex items-center justify-center w-5 h-5 rounded-full bg-[#00C853] text-white text-[10px]">
              अ
            </div>
            <span>{selectedLanguageObj.nativeName}</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={() => navigate({ to: "/" })}
            className="flex items-center justify-center w-9 h-9 rounded-full bg-neutral-50 hover:bg-neutral-100 text-neutral-700"
            aria-label="Back to Home"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
        )}

        <button
          type="button"
          onClick={() => {
            if (onComplete) onComplete();
            else navigate({ to: "/" });
          }}
          className="text-xs font-bold text-neutral-500 hover:text-neutral-800 px-3 py-1.5 rounded-full hover:bg-neutral-100 transition-colors"
        >
          {t("slides.skip", "Skip to Sign-up")}
        </button>
      </div>

      {/* 2. Center Content: Instruction Card */}
      <div className="flex flex-col items-center text-center my-auto py-6 animate-in fade-in zoom-in-95 duration-200" key={slide.id}>
        <div className="relative flex items-center justify-center w-36 h-36 mb-8 rounded-full bg-emerald-50 border-4 border-emerald-100 shadow-lg">
          <div className="absolute inset-0 rounded-full bg-emerald-200/40 animate-pulse" />
          <IconComponent className="w-16 h-16 text-[#00C853] stroke-[1.8] relative z-10" />

          {/* Badge */}
          <div className="absolute -bottom-3 px-3 py-1 bg-white border border-emerald-300 rounded-full shadow-xs">
            <span className="text-[10px] font-black tracking-wider text-emerald-800 uppercase">
              {slide.badge}
            </span>
          </div>
        </div>

        <h2 className="text-2xl font-black text-neutral-950 tracking-tight mb-3">
          {slide.title}
        </h2>

        <p className="text-sm font-medium text-neutral-600 max-w-xs leading-relaxed mb-6">
          {slide.subtitle}
        </p>

        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-900 border border-emerald-200 text-xs font-bold">
          <Sparkles className="w-3.5 h-3.5 text-[#00C853]" />
          <span>{slide.highlight}</span>
        </div>
      </div>

      {/* 3. Bottom Controls: Indicators + Action Button */}
      <div className="pb-4 space-y-5">
        {/* Step Indicator Dots */}
        <div className="flex items-center justify-center gap-2">
          {slides.map((_, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => setCurrentSlide(idx)}
              className={`h-2 rounded-full transition-all duration-300 ${
                currentSlide === idx
                  ? "w-8 bg-[#00C853]"
                  : "w-2 bg-neutral-200 hover:bg-neutral-300"
              }`}
              aria-label={`Go to slide ${idx + 1}`}
            />
          ))}
        </div>

        {/* Action Button */}
        <button
          type="button"
          onClick={handleNext}
          className="w-full h-13.5 flex items-center justify-center gap-2 bg-[#00C853] hover:bg-[#00B248] active:bg-[#009624] text-white font-black text-sm tracking-wide rounded-2xl shadow-lg shadow-emerald-500/25 active:scale-98 transition-all"
        >
          <span>
            {isLast
              ? t("slides.getStarted", "Get Started & Sign-up")
              : t("slides.next", "Next Instruction")}
          </span>
          <ArrowRight className="w-4 h-4 stroke-[2.5]" />
        </button>
      </div>
    </div>
  );
};
