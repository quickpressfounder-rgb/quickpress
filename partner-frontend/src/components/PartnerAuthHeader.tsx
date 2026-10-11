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
      {badge ? (
        <span className="mt-2.5 inline-flex items-center rounded-full bg-emerald-50 border border-emerald-200 px-3 py-0.5 text-[10px] font-black tracking-widest text-emerald-700 uppercase shadow-xs">
          {badge}
        </span>
      ) : null}
      {withTagline ? (
        <p className="mt-2 text-[11px] font-bold uppercase tracking-[0.25em] text-zinc-500">
          Laundry <span className="text-emerald-600">·</span> Pickup{" "}
          <span className="text-emerald-600">·</span> Delivery
        </p>
      ) : null}
    </div>
  );
}

