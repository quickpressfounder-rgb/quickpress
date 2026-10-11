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
    <div className="flex flex-col items-center select-none pt-2">
      <img
        src="/quickpress-partner-logo.png"
        alt="QuickPress Partner Onboarding"
        className="h-14 sm:h-16 w-auto max-w-[280px] sm:max-w-[340px] object-contain drop-shadow-xs"
      />
      {/* Clean Logo without redundant badge */}
      {withTagline ? (
        <p className="mt-2 text-[11px] font-bold uppercase tracking-[0.25em] text-zinc-500">
          Laundry <span className="text-emerald-600">·</span> Pickup{" "}
          <span className="text-emerald-600">·</span> Delivery
        </p>
      ) : null}
    </div>
  );
}

