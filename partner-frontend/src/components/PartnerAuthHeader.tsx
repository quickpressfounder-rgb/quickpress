/**
 * Official Brand Lockup for QuickPress Partner Onboarding & Auth screens.
 */
export function PartnerAuthHeader({
  badge,
  withTagline = false,
}: {
  badge?: string;
  withTagline?: boolean;
}) {
  return (
    <div className="flex flex-col items-center select-none pt-1">
      <img
        src="/quickpress-brand-logo-transparent.png"
        alt="QuickPress"
        className="h-10 sm:h-12 w-auto max-w-[220px] sm:max-w-[260px] object-contain drop-shadow-none"
      />
      {/* Clean Tagline */}
      {withTagline ? (
        <p className="mt-1.5 text-[10.5px] sm:text-[11px] font-bold uppercase tracking-[0.25em] text-zinc-500">
          Laundry <span className="text-emerald-600">·</span> Pickup{" "}
          <span className="text-emerald-600">·</span> Delivery
        </p>
      ) : null}
    </div>
  );
}

