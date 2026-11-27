import { MapPin } from "lucide-react";

export function LocationDetecting({
  label = "Fetching your location…",
  sublabel = "Pinpointing your address",
}: {
  label?: string;
  sublabel?: string;
  statusBadge?: string;
  onCancel?: () => void;
}) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-gradient-to-b from-[#0C4427] via-[#09361F] to-[#052314] px-6 text-white animate-in fade-in duration-300 overflow-hidden select-none"
    >
      {/* Subtle Ambient Deep Green Depth Glow */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div className="size-96 rounded-full bg-[#167946]/25 blur-3xl" />
      </div>

      {/* Classic Pronto-Style Expanding Concentric Radar Target + Floating Pin */}
      <div className="relative flex size-60 items-center justify-center">
        {/* Static subtle radar guide rings */}
        <span className="absolute size-56 rounded-full border border-white/[0.06]" />
        <span className="absolute size-36 rounded-full border border-white/[0.09] bg-white/[0.03]" />

        {/* Three smooth staggered sonar ripple waves */}
        <span className="locate-ring absolute size-32 rounded-full border border-emerald-200/45 bg-emerald-300/[0.12] will-change-transform" />
        <span
          className="locate-ring absolute size-32 rounded-full border border-emerald-200/35 bg-emerald-300/[0.09] will-change-transform"
          style={{ animationDelay: "0.86s" }}
        />
        <span
          className="locate-ring absolute size-32 rounded-full border border-emerald-200/25 bg-emerald-300/[0.06] will-change-transform"
          style={{ animationDelay: "1.72s" }}
        />

        {/* Ground shadow beneath floating pin */}
        <span className="locate-shadow absolute bottom-[62px] h-2.5 w-11 rounded-full bg-black/50 blur-[3px]" />

        {/* Elevated white pin medallion */}
        <div className="locate-bob relative flex size-20 items-center justify-center rounded-full bg-white shadow-[0_18px_45px_rgba(0,0,0,0.42)] ring-4 ring-white/20">
          <MapPin className="size-9 fill-[#0B3D23] text-[#0B3D23]" strokeWidth={2.2} />
        </div>
      </div>

      {/* Clean Minimal Typography */}
      <div className="relative z-10 mt-6 flex flex-col items-center text-center max-w-xs">
        <h2 className="text-[20px] sm:text-[22px] font-bold tracking-[-0.02em] text-white leading-snug">
          {label}
        </h2>
        {sublabel ? (
          <p className="mt-2 text-[13px] font-medium text-emerald-100/75 leading-relaxed">
            {sublabel}
          </p>
        ) : null}
      </div>
    </div>
  );
}
