/**
 * Typographic brand lockup for QuickPress Partner — brand wordmark instead of image logo.
 */
export function PartnerAuthHeader({
  badge = "PARTNER",
  withTagline = true,
}: {
  badge?: string;
  withTagline?: boolean;
}) {
  return (
    <div className="flex flex-col items-center select-none pt-2">
      <div className="auth-logo-in auth-logo-float flex items-center gap-2">
        <h1 className="auth-wordmark text-[2.75rem] font-black leading-none tracking-[-0.05em] sm:text-[3.25rem] text-foreground">
          <span>Quick</span>
          <span className="text-primary">Press</span>
        </h1>
        {badge ? (
          <span className="rounded-full bg-primary/10 border border-primary/20 px-2.5 py-0.5 text-[10px] font-black tracking-widest text-primary uppercase shadow-xs">
            {badge}
          </span>
        ) : null}
      </div>

      <span className="auth-rise relative mt-3 block h-[3px] w-28 overflow-hidden rounded-full bg-primary/20 [animation-delay:80ms]">
        <span className="brand-sweep absolute inset-y-0 left-0 w-1/2 rounded-full bg-gradient-to-r from-transparent via-primary to-transparent" />
      </span>

      {withTagline ? (
        <p className="auth-rise mt-3 text-[11px] font-bold uppercase tracking-[0.3em] text-muted-foreground [animation-delay:140ms]">
          Laundry <span className="text-primary">·</span> Pickup{" "}
          <span className="text-primary">·</span> Delivery
        </p>
      ) : null}

      {/* Decorative ambient bubbles */}
      <div className="pointer-events-none relative mt-2 h-6 w-40 opacity-70">
        <span className="auth-flow-bubble absolute bottom-3 left-[18%] size-2 rounded-full bg-primary/60" />
        <span className="auth-flow-bubble absolute bottom-2 left-[46%] size-1.5 rounded-full bg-sky-400/60 [animation-delay:600ms]" />
        <span className="auth-flow-bubble absolute bottom-4 left-[72%] size-2.5 rounded-full bg-primary/40 [animation-delay:1200ms]" />
      </div>
    </div>
  );
}

