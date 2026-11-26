function Shimmer({ className = "" }: { className?: string }) {
  return <div className={`shimmer rounded-2xl bg-zinc-200/70 ${className}`} />;
}

/** Loading placeholder for the Quick+ Membership screen. */
export function MembershipSkeleton() {
  return (
    <div className="mx-auto max-w-md px-4 pb-28 pt-4 space-y-3.5" aria-hidden="true">
      <div className="rounded-2xl border border-zinc-200/80 bg-white p-4 shadow-2xs space-y-3">
        <Shimmer className="h-5 w-24" />
        <Shimmer className="h-6 w-48" />
        <div className="grid grid-cols-3 gap-2">
          <Shimmer className="h-12 rounded-xl" />
          <Shimmer className="h-12 rounded-xl" />
          <Shimmer className="h-12 rounded-xl" />
        </div>
      </div>
      <Shimmer className="h-11 rounded-2xl" />
      <div className="grid grid-cols-3 gap-2">
        <Shimmer className="h-20 rounded-2xl" />
        <Shimmer className="h-20 rounded-2xl" />
        <Shimmer className="h-20 rounded-2xl" />
      </div>
      <div className="rounded-2xl border border-zinc-200/80 bg-white p-4 shadow-2xs space-y-3">
        <Shimmer className="h-6 w-36" />
        <Shimmer className="h-14 rounded-xl" />
        <Shimmer className="h-20 rounded-xl" />
        <Shimmer className="h-11 rounded-xl" />
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
