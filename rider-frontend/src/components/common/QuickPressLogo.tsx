import React from "react";

interface QuickPressLogoProps {
  size?: "sm" | "md" | "lg" | "xl";
  showSubtitle?: boolean;
  subtitleText?: string;
  className?: string;
}

export const QuickPressLogo: React.FC<QuickPressLogoProps> = ({
  size = "md",
  showSubtitle = true,
  subtitleText = "DELIVERY PARTNER",
  className = "",
}) => {
  const imageHeights = {
    sm: "h-7",
    md: "h-10",
    lg: "h-14",
    xl: "h-18",
  };

  const subtitleSizes = {
    sm: "text-[9px] tracking-widest mt-0.5",
    md: "text-[11px] tracking-widest mt-0.5",
    lg: "text-xs tracking-widest mt-1",
    xl: "text-sm tracking-widest mt-1.5",
  };

  return (
    <div className={`flex flex-col items-center select-none ${className}`}>
      {/* Official QuickPress Logo Image (Black Quick + Green Press) */}
      <img
        src="/quickpress-brand-logo-transparent.png"
        alt="QuickPress"
        className={`${imageHeights[size]} w-auto object-contain pointer-events-none bg-transparent`}
      />

      {/* Subtitle Badge */}
      {showSubtitle && (
        <span
          className={`font-black uppercase text-neutral-600 text-center ${subtitleSizes[size]}`}
        >
          {subtitleText}
        </span>
      )}
    </div>
  );
};
