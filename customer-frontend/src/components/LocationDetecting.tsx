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
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-white dark:bg-zinc-950 px-6 text-zinc-900 dark:text-zinc-50 animate-in fade-in duration-300 overflow-hidden select-none"
    >
      {/* Classic Concentric Dark-Green Sonar Target + Floating Pin on White Canvas */}
      <div className="relative flex size-60 items-center justify-center">
        {/* Static subtle radar guide rings */}
        <span className="absolute size-56 rounded-full border border-[#0B4D2C]/[0.07]" />
        <span className="absolute size-36 rounded-full border border-[#0B4D2C]/[0.12] bg-[#0B4D2C]/[0.04]" />

        {/* Three smooth staggered dark-green sonar ripple waves */}
        <span className="locate-ring absolute size-32 rounded-full border border-[#0B4D2C]/35 bg-[#0B4D2C]/[0.10] will-change-transform" />
        <span
          className="locate-ring absolute size-32 rounded-full border border-[#0B4D2C]/25 bg-[#0B4D2C]/[0.07] will-change-transform"
          style={{ animationDelay: "0.86s" }}
        />
        <span
          className="locate-ring absolute size-32 rounded-full border border-[#0B4D2C]/15 bg-[#0B4D2C]/[0.04] will-change-transform"
          style={{ animationDelay: "1.72s" }}
        />

        {/* Ground shadow beneath floating pin */}
        <span className="locate-shadow absolute bottom-[62px] h-2.5 w-11 rounded-full bg-[#0B4D2C]/25 blur-[3px]" />

        {/* Crisp white disc framing the solid dark-green location mark */}
        <div className="locate-bob relative flex size-20 items-center justify-center rounded-full bg-white dark:bg-zinc-900 shadow-[0_14px_38px_rgba(11,77,44,0.20)] border border-[#0B4D2C]/15">
          <MapPin className="size-10 fill-[#0B4D2C] text-white dark:text-zinc-900" strokeWidth={1.8} />
        </div>
      </div>

      {/* Clean Minimal Typography */}
      <div className="relative z-10 mt-6 flex flex-col items-center text-center max-w-xs">
        <h2 className="text-[20px] sm:text-[22px] font-bold tracking-[-0.02em] text-zinc-900 dark:text-zinc-50 leading-snug">
          {label}
        </h2>
        {sublabel ? (
          <p className="mt-2 text-[13px] font-medium text-zinc-500 dark:text-zinc-400 leading-relaxed">
            {sublabel}
          </p>
        ) : null}
      </div>
    </div>
  );
}
