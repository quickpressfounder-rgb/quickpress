import React from "react";

interface HangingBoardWatermarkProps {
  label: string;
  sublabel?: string;
  className?: string;
}

/**
 * Hanging Board Watermark matching the exact user-uploaded "CLOSED" signboard style.
 * Displays dynamic stage text: "NO ACTIVE", "NO PICKED", "NO PROCESS", "NO OUT FOR DELIVERY", etc.
 */
export function HangingBoardWatermark({
  label,
  sublabel,
  className = "",
}: HangingBoardWatermarkProps) {
  // Dynamically calculate font size based on text length to keep text perfectly within the signboard
  const textLength = label.length;
  let fontSize = 28;
  if (textLength > 16) {
    fontSize = 17;
  } else if (textLength > 12) {
    fontSize = 20;
  } else if (textLength > 9) {
    fontSize = 24;
  }

  return (
    <div className={`relative flex flex-col items-center justify-center select-none ${className}`}>
      <svg
        viewBox="0 0 340 220"
        className="w-56 sm:w-64 md:w-72 h-auto drop-shadow-sm transition-transform duration-500 hover:scale-[1.02]"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          {/* Soft shadow for the signboard */}
          <filter id="hanging-board-shadow" x="0" y="40" width="340" height="180" filterUnits="userSpaceOnUse">
            <feDropShadow dx="-6" dy="12" stdDeviation="8" floodColor="#94a3b8" floodOpacity="0.28" />
          </filter>
        </defs>

        {/* =========================================================================
            1. HANGING CORDS / WIRES
        ========================================================================= */}
        {/* Left Cord */}
        <line
          x1="170"
          y1="40"
          x2="72"
          y2="134"
          stroke="#cbd5e1"
          strokeWidth="3.5"
          strokeLinecap="round"
        />
        {/* Right Cord */}
        <line
          x1="170"
          y1="40"
          x2="228"
          y2="78"
          stroke="#cbd5e1"
          strokeWidth="3.5"
          strokeLinecap="round"
        />

        {/* =========================================================================
            2. TOP RED NAIL / HOOK PIN
        ========================================================================= */}
        {/* Shadow behind nail */}
        <circle cx="170" cy="42" r="11" fill="#cbd5e1" opacity="0.6" />
        {/* Red Nail Pin */}
        <circle cx="170" cy="40" r="11" fill="#e64956" />
        {/* Subtle 3D highlight on nail */}
        <circle cx="167" cy="37" r="4" fill="#ffffff" opacity="0.4" />

        {/* =========================================================================
            3. TILTED SIGNBOARD (Rotated -21 degrees)
        ========================================================================= */}
        <g transform="rotate(-21, 170, 130)">
          {/* Drop Shadow Board */}
          <rect
            x="48"
            y="94"
            width="244"
            height="112"
            rx="12"
            fill="#d1d9e6"
            opacity="0.6"
          />

          {/* White Main Signboard */}
          <rect
            x="45"
            y="88"
            width="244"
            height="112"
            rx="12"
            fill="#ffffff"
            stroke="#8b95a5"
            strokeWidth="3"
          />

          {/* Eyelet / Hole for Left Cord */}
          <circle cx="68" cy="100" r="4.5" fill="#e2e8f0" stroke="#8b95a5" strokeWidth="2" />
          {/* Eyelet / Hole for Right Cord */}
          <circle cx="266" cy="100" r="4.5" fill="#e2e8f0" stroke="#8b95a5" strokeWidth="2" />

          {/* Dynamic Signboard Text (e.g. "NO ACTIVE", "NO PICKED", etc.) */}
          <text
            x="167"
            y="154"
            textAnchor="middle"
            fill="#717c98"
            fontFamily="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
            fontWeight="900"
            fontSize={fontSize}
            letterSpacing="1.8"
            className="select-none tracking-wider"
          >
            {label}
          </text>
        </g>
      </svg>

      {sublabel && (
        <span className="mt-2 text-[11px] font-black uppercase tracking-wider text-zinc-400">
          {sublabel}
        </span>
      )}
    </div>
  );
}
