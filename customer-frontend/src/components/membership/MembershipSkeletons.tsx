function Shimmer({ className = "" }: { className?: string }) {
  return <div className={`shimmer rounded-2xl bg-zinc-200/70 ${className}`} />;
}

/** Loading placeholder for the Quick+ Membership screen. */
export function MembershipSkeleton() {
  return (
    <div className="mx-auto max-w-md px-4 pb-28 pt-4 space-y-4" aria-hidden="true">
      <div className="rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-2xs space-y-3">
        <Shimmer className="h-5 w-28" />
        <Shimmer className="h-7 w-48" />
        <Shimmer className="h-4 w-full" />
        <Shimmer className="h-10 w-full rounded-xl" />
      </div>
      <div className="grid grid-cols-2 gap-2.5">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="rounded-2xl border border-zinc-200/80 bg-white p-3.5 shadow-2xs space-y-2">
            <Shimmer className="size-8 rounded-xl" />
            <Shimmer className="h-5 w-16" />
            <Shimmer className="h-3 w-20" />
          </div>
        ))}
      </div>
      <Shimmer className="h-11 rounded-2xl" />
      <div className="space-y-3">
        {Array.from({ length: 2 }).map((_, index) => (
          <div key={index} className="rounded-2xl border border-zinc-200/80 bg-white p-4 shadow-2xs space-y-2.5">
            <Shimmer className="h-5 w-36" />
            <Shimmer className="h-16 w-full" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function MembershipHistorySkeleton() {
  return (
    <div className="mt-3 space-y-2.5" aria-hidden="true">
      {Array.from({ length: 3 }).map((_, index) => (
        <div key={index} className="rounded-2xl border border-zinc-200/80 bg-white p-4 shadow-2xs space-y-2">
          <Shimmer className="h-4 w-32" />
          <Shimmer className="h-3 w-48" />
        </div>
      ))}
    </div>
  );
}
