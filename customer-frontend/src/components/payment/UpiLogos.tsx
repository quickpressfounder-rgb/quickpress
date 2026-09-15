import React from "react";

/**
 * Pixel-perfect official SVG logos for Indian UPI Apps & Payment Brands.
 */

// 1. PhonePe Official Logo (Signature Purple with Devanagari 'पे')
export function PhonePeLogo({ className = "size-9" }: { className?: string }) {
  return (
    <div
      className={`rounded-xl bg-[#5f259f] flex items-center justify-center p-1.5 shadow-xs shrink-0 select-none ${className}`}
      title="PhonePe UPI"
    >
      <svg viewBox="0 0 100 100" className="w-full h-full" fill="none">
        {/* PhonePe Purple Circle Base */}
        <circle cx="50" cy="50" r="46" fill="#5f259f" />
        
        {/* Authentic White PhonePe Devanagari 'पे' Glyph */}
        {/* Shirorekha (Top Horizontal Bar) */}
        <rect x="22" y="32" width="56" height="6.5" rx="3.25" fill="#ffffff" />
        
        {/* Vertical Stem on Right */}
        <rect x="58" y="32" width="7" height="42" rx="3.5" fill="#ffffff" />
        
        {/* Left Curved Bowl of 'प' */}
        <path
          d="M34 35 v18 c0 7.5 6 13.5 13.5 13.5 H59 v-6.5 H47.5 c-4 0 -7 -3 -7 -7 V35 H34 z"
          fill="#ffffff"
        />
        
        {/* Upper Matra 'े' Angled Upwards */}
        <path
          d="M58 33 c-1.5 -8 3.5 -15 10.5 -18 1.8 -0.8 3.5 0.5 3.5 2.2 0 1.2 -0.8 2.2 -1.8 2.8 -4.8 2.5 -7.8 7 -7.2 13 H58 z"
          fill="#ffffff"
        />
      </svg>
    </div>
  );
}

// 2. Google Pay Official 4-Color Ribbon Logo
export function GooglePayLogo({ className = "size-9" }: { className?: string }) {
  return (
    <div
      className={`rounded-xl bg-white border border-zinc-200 flex items-center justify-center p-1.5 shadow-xs shrink-0 select-none ${className}`}
      title="Google Pay"
    >
      <svg viewBox="0 0 100 100" className="w-full h-full" fill="none">
        {/* Google Pay Ribbon / GPay Iconic Colors */}
        <path
          d="M74.8 51.5c0-1.8-.2-3.5-.5-5.2H50.5v9.8h13.6c-.6 3.2-2.4 5.9-5.1 7.7v6.4h8.3c4.8-4.5 7.5-11.1 7.5-18.7z"
          fill="#4285F4"
        />
        <path
          d="M50.5 76.2c7 0 12.8-2.3 17.1-6.3l-8.3-6.4c-2.3 1.6-5.3 2.5-8.8 2.5-6.7 0-12.5-4.5-14.5-10.7h-8.6v6.6c4.3 8.5 13.1 14.3 23.1 14.3z"
          fill="#34A853"
        />
        <path
          d="M36 55.3c-.5-1.6-.8-3.3-.8-5.1s.3-3.5.8-5.1v-6.6h-8.6C25.6 42.1 24.6 46 24.6 50.2s1 8.1 2.8 11.7l8.6-6.6z"
          fill="#FBBC05"
        />
        <path
          d="M50.5 34.4c3.8 0 7.2 1.3 9.9 3.9l7.4-7.4C63.3 26.8 57.5 24.2 50.5 24.2c-10 0-18.8 5.8-23.1 14.3l8.6 6.6c2-6.2 7.8-10.7 14.5-10.7z"
          fill="#EA4335"
        />
      </svg>
    </div>
  );
}

// 3. Paytm Official Logo (Authentic Dark Navy #002970 & Sky Cyan #00BAF2)
export function PaytmLogo({ className = "size-9" }: { className?: string }) {
  return (
    <div
      className={`rounded-xl bg-white border border-blue-100 flex items-center justify-center px-2 py-1 shadow-xs shrink-0 select-none ${className}`}
      title="Paytm UPI"
    >
      <svg viewBox="0 0 130 45" className="w-full h-auto" fill="none">
        {/* P */}
        <path
          d="M10 8 h14 c6.5 0 11.5 4.5 11.5 11.5 S30.5 31 24 31 H18 v8 H10 V8 z M18 15 v10 h6 c3 0 5 -2 5 -5 s-2 -5 -5 -5 h-6 z"
          fill="#002970"
        />
        {/* a */}
        <path
          d="M48 18 v21 h-7 v-3.5 c-2 2.5 -5 4 -8.5 4 -6 0 -10 -4 -10 -9.5 0 -6 4.5 -9.5 11.5 -9.5 h7 v-1 c0 -2.5 -2 -4 -5.5 -4 -3 0 -5 1 -7 2.5 L36 14 c3 -2 6.5 -3 10.5 -3 7 0 11.5 3.5 11.5 9 z M41 26 h-5 c-3 0 -5 1.5 -5 4 0 2.5 2 4 4.5 4 3.5 0 5.5 -2 5.5 -5 v-3 z"
          fill="#002970"
        />
        {/* y */}
        <path
          d="M58 18 l4.5 14 4.5 -14 h8 l-8.5 21 c-2 5 -5 7 -10.5 7 h-3 v-6 h2 c2.5 0 4 -1 5 -3.5 L50 18 h8 z"
          fill="#002970"
        />
        {/* t */}
        <path
          d="M84 12 v6 h6 v5 h-6 v11 c0 2 1 3 3 3 h3 v5 c-2 0.5 -4 1 -6.5 1 -5.5 0 -8 -3 -8 -8 V23 h-4 v-5 h4 v-6 h8 z"
          fill="#00BAF2"
        />
        {/* m */}
        <path
          d="M93 18 h7 v3.5 c2 -2.5 5 -4 8.5 -4 3.5 0 6 1.5 7.5 4.5 2 -2.5 5 -4.5 9 -4.5 6 0 9 4 9 10 v15 h-7.5 V27 c0 -3 -1.5 -4.5 -4 -4.5 -2.5 0 -4.5 1.8 -4.5 4.5 v16 h-7.5 V27 c0 -3 -1.5 -4.5 -4 -4.5 -2.5 0 -4.5 1.8 -4.5 4.5 v16 H93 V18 z"
          fill="#00BAF2"
        />
      </svg>
    </div>
  );
}

// 4. BHIM Official Tricolor Indian UPI Logo
export function BhimUpiLogo({ className = "size-9" }: { className?: string }) {
  return (
    <div
      className={`rounded-xl bg-white border border-zinc-200 flex items-center justify-center p-1 shadow-xs shrink-0 select-none ${className}`}
      title="BHIM UPI"
    >
      <svg viewBox="0 0 80 80" className="w-full h-full" fill="none">
        <path d="M15 15h22l18 25-18 25H15l18-25L15 15z" fill="#00773E" />
        <path d="M43 15h22l-18 25 18 25H43l-18-25 18-25z" fill="#F37021" />
      </svg>
    </div>
  );
}

// 5. CRED Official Sleek Dark Crest Logo
export function CredLogo({ className = "size-9" }: { className?: string }) {
  return (
    <div
      className={`rounded-xl bg-zinc-950 text-white flex items-center justify-center p-1.5 shadow-xs shrink-0 select-none ${className}`}
      title="CRED"
    >
      <svg viewBox="0 0 100 100" className="w-full h-full" fill="none">
        <path
          d="M50 15L20 28v28c0 19.3 12.8 37.3 30 42 17.2-4.7 30-22.7 30-42V28L50 15zm0 14l18 7.8v19.4c0 11.8-7.8 22.8-18 25.7-10.2-2.9-18-13.9-18-25.7V36.8L50 29z"
          fill="#ffffff"
        />
        <circle cx="50" cy="52" r="8" fill="#10b981" />
      </svg>
    </div>
  );
}

// 6. Amazon Pay Official Logo (Black with Gold-Orange curved arrow)
export function AmazonPayLogo({ className = "size-9" }: { className?: string }) {
  return (
    <div
      className={`rounded-xl bg-zinc-900 flex items-center justify-center p-1.5 shadow-xs shrink-0 select-none ${className}`}
      title="Amazon Pay"
    >
      <svg viewBox="0 0 100 100" className="w-full h-full" fill="none">
        <text
          x="20"
          y="48"
          fontFamily="system-ui, sans-serif"
          fontWeight="900"
          fontSize="32"
          fill="#ffffff"
        >
          pay
        </text>
        {/* Amazon Smile Curve */}
        <path
          d="M18 64c18 12 44 12 62-2"
          stroke="#FF9900"
          strokeWidth="6"
          strokeLinecap="round"
        />
        <path
          d="M74 54l8 8-11 3"
          fill="#FF9900"
        />
      </svg>
    </div>
  );
}

// 7. Mobikwik Official Royal Blue 'M' Logo
export function MobikwikLogo({ className = "size-9" }: { className?: string }) {
  return (
    <div
      className={`rounded-xl bg-[#005CB9] text-white flex items-center justify-center p-1.5 shadow-xs shrink-0 select-none ${className}`}
      title="Mobikwik"
    >
      <span className="font-black text-lg tracking-tight font-sans">M</span>
    </div>
  );
}

// 8. LazyPay Official Coral/Rose Badge
export function LazyPayLogo({ className = "size-9" }: { className?: string }) {
  return (
    <div
      className={`rounded-xl bg-[#ff4365] text-white flex items-center justify-center p-1.5 shadow-xs shrink-0 select-none ${className}`}
      title="LazyPay"
    >
      <span className="font-black text-xs tracking-tighter">LP</span>
    </div>
  );
}
