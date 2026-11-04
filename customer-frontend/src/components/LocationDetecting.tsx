import { MapPin, X, Radio } from "lucide-react";

export function LocationDetecting({
  label = "Detecting your location…",
  sublabel = "Finding verified laundry partners near you",
  statusBadge = "Live GPS Triangulation",
  onCancel,
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
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-white/95 dark:bg-zinc-950/95 backdrop-blur-md px-6 animate-in fade-in duration-300 overflow-hidden"
    >
      {/* Brand Header — Safe for Dynamic Island / Notch */}
      <div className="absolute top-[max(1.5rem,calc(env(safe-area-inset-top,0px)+0.75rem))] flex items-center gap-1.5 text-sm font-black tracking-tight">
        <span className="text-zinc-900 dark:text-zinc-100">Quick</span>
        <span className="text-emerald-600">Press</span>
      </div>

      {/* Optional Cancel Button */}
      {onCancel ? (
        <button
          type="button"
          onClick={onCancel}
          className="absolute top-[max(1.25rem,calc(env(safe-area-inset-top,0px)+0.5rem))] right-5 flex size-10 items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 transition-all hover:bg-zinc-200 dark:hover:bg-zinc-700 active:scale-95 shadow-xs"
          aria-label="Cancel location detection"
        >
          <X className="size-5" />
        </button>
      ) : null}

      {/* Live Status Badge */}
      <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-3.5 py-1 text-xs font-bold text-emerald-700 dark:text-emerald-400">
        <Radio className="size-3.5 text-emerald-600 animate-pulse" />
        <span>{statusBadge}</span>
      </div>

      {/* Pulsing Concentric Radar Target with Bobbing Pin */}
      <div className="relative flex size-52 items-center justify-center">
        {/* Soft outer glow */}
        <span className="absolute size-48 rounded-full bg-emerald-500/10 blur-2xl" />
        {/* Base circle */}
        <span className="absolute size-36 rounded-full bg-emerald-500/10 dark:bg-emerald-500/20" />
        {/* Animated concentric wave 1 */}
        <span className="locate-ring absolute size-40 rounded-full border border-emerald-500/35 bg-emerald-500/20 will-change-transform" />
        {/* Animated concentric wave 2 with stagger */}
        <span
          className="locate-ring absolute size-40 rounded-full border border-emerald-500/30 bg-emerald-500/15 will-change-transform"
          style={{ animationDelay: "0.75s" }}
        />
        {/* Animated concentric wave 3 */}
        <span
          className="locate-ring absolute size-40 rounded-full border border-emerald-500/20 bg-emerald-500/10 will-change-transform"
          style={{ animationDelay: "1.4s" }}
        />
        {/* Inner center pill with bobbing icon */}
        <div className="locate-bob relative flex size-18 items-center justify-center rounded-full bg-white dark:bg-zinc-900 shadow-2xl border-2 border-emerald-500/30">
          <MapPin className="size-9 fill-emerald-600 text-emerald-600 drop-shadow-md" />
        </div>
      </div>

      {/* Dynamic Status Text */}
      <h2 className="mt-8 text-center text-xl font-black tracking-tight text-foreground sm:text-2xl max-w-sm">
        {label}
      </h2>
      <p className="mt-2 text-center text-xs font-semibold text-muted-foreground sm:text-sm max-w-xs leading-relaxed">
        {sublabel}
      </p>

      {/* Subtle indicator bar */}
      <div className="mt-7 h-1.5 w-32 overflow-hidden rounded-full bg-emerald-500/15">
        <div className="h-full w-full bg-emerald-600 animate-pulse rounded-full" />
      </div>
    </div>
  );
}
