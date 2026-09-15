import { memo, type ReactNode } from "react";

/**
 * Stable, high-performance root container for routes.
 * Avoids destroying and remounting the DOM tree on every pathname change,
 * eliminating visual blinking, white flashes, and navigation latency.
 */
export const PageTransition = memo(function PageTransition({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen">
      {children}
    </div>
  );
});
