import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import "../styles.css";
import { reportLovableError } from "@/shared/lib/lovable-error-reporting";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error("Root boundary caught error:", error);
  const router = useRouter();

  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });

    // Automatic recovery for stale bundle chunk / CDN cache mismatch errors
    const errorMsg = String(error?.message || error || "");
    if (
      errorMsg.includes("positive") ||
      errorMsg.includes("Failed to fetch dynamically imported module") ||
      errorMsg.includes("Loading chunk") ||
      errorMsg.includes("Importing a module script failed")
    ) {
      const key = "__qp_auto_recovered_v3";
      if (!sessionStorage.getItem(key)) {
        sessionStorage.setItem(key, "true");
        if ("caches" in window) {
          caches.keys().then((names) => {
            for (const name of names) caches.delete(name);
          });
        }
        window.location.reload();
      }
    }
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-950 px-4 text-white">
      <div className="max-w-md text-center p-8 bg-zinc-900 rounded-3xl border border-zinc-800 shadow-2xl">
        <div className="size-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto mb-4 font-black text-xl">
          QP
        </div>
        <h1 className="text-xl font-black tracking-tight text-white">
          {errorMsg.includes("chunk") || errorMsg.includes("dynamically")
            ? "Updating QuickPress Admin..."
            : "QuickPress Admin Error"}
        </h1>
        <p className="mt-2 text-xs text-zinc-400 break-words">
          {error?.message || "An unexpected error occurred. Click below to reload the latest application state."}
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <button
            onClick={() => reset()}
            className="inline-flex items-center justify-center rounded-xl bg-zinc-800 border border-zinc-700 px-4 py-2 text-xs font-bold text-zinc-200 hover:bg-zinc-700 transition-all"
          >
            Try Again
          </button>
          <button
            onClick={() => {
              if ("caches" in window) {
                caches.keys().then((names) => {
                  for (const name of names) caches.delete(name);
                });
              }
              sessionStorage.clear();
              window.location.href = window.location.pathname;
            }}
            className="inline-flex items-center justify-center rounded-xl bg-emerald-600 px-5 py-2.5 text-xs font-extrabold text-white transition-all hover:bg-emerald-500 active:scale-95 shadow-lg shadow-emerald-900/30"
          >
            Reload App
          </button>
        </div>
      </div>
    </div>
  );
}


export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "QuickPress Admin — Operations Console" },
      {
        name: "description",
        content: "Operate QuickPress: orders, customers, partners, riders, pricing and payouts.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap",
      },
      { rel: "icon", href: "/favicon.ico", type: "image/x-icon" },
    ],
    scripts: [
      {
        src: "https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js",
        defer: true,
      },
    ],
  }),

  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className="bg-white" suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body className="min-h-screen bg-white text-foreground antialiased selection:bg-primary/20" suppressHydrationWarning>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  useEffect(() => {
    import("@/api/core/onesignal").then((m) => m.initOneSignal()).catch(() => {});
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
      <Outlet />
    </QueryClientProvider>
  );
}
