import { MapPin } from "lucide-react";

export function LocationDetecting({
  label = "Detecting your location…",
  sublabel = "Finding verified laundry partners near you",
}: {
  label?: string;
  sublabel?: string;
}) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-white dark:bg-zinc-950 px-6"
    >
      {/* Brand Header */}
      <div className="absolute top-12 flex items-center gap-1.5 text-sm font-black tracking-tight">
        <span className="text-zinc-900 dark:text-zinc-100">Quick</span>
        <span className="text-emerald-600">Press</span>
      </div>

      {/* Pulsing Concentric Radar Target */}
      <div className="relative flex size-48 items-center justify-center">
        {/* Soft outer glow */}
        <span className="absolute size-44 rounded-full bg-emerald-500/5 blur-xl" />
        {/* Base circle */}
        <span className="absolute size-32 rounded-full bg-emerald-500/10 dark:bg-emerald-500/15" />
        {/* Animated wave 1 */}
        <span className="locate-ring absolute size-36 rounded-full border border-emerald-500/30 bg-emerald-500/20" />
        {/* Animated wave 2 */}
        <span
          className="locate-ring absolute size-36 rounded-full border border-emerald-500/25 bg-emerald-500/15"
          style={{ animationDelay: "0.75s" }}
        />
        {/* Inner center pill with bobbing icon */}
        <div className="locate-bob relative flex size-16 items-center justify-center rounded-full bg-white dark:bg-zinc-900 shadow-xl border border-emerald-100 dark:border-emerald-950/60">
          <MapPin className="size-8 fill-emerald-600 text-emerald-600 drop-shadow-sm" />
        </div>
      </div>

      <h2 className="mt-8 text-center text-lg font-black tracking-tight text-foreground sm:text-xl">
        {label}
      </h2>
      <p className="mt-2 text-center text-xs font-semibold text-muted-foreground sm:text-sm">
        {sublabel}
      </p>

      {/* Sleek bottom status pill */}
      <div className="absolute bottom-10 flex items-center gap-2 rounded-full border border-zinc-200/80 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/80 px-4 py-2 text-[11px] font-bold text-muted-foreground shadow-xs">
        <span className="relative flex size-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex size-2 rounded-full bg-emerald-600" />
        </span>
        <span>Satellite GPS Lock Active</span>
      </div>
    </div>
  );
}
