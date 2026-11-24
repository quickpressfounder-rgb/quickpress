import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";

import "../styles.css";
import { reportLovableError } from "@/shared/lib/lovable-error-reporting";
import { startAdminAutoRefresh } from "@/api/admin/admin-auth-api";
import { writeSession } from "@/api/core/session-store";

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

function StaffLoginForm({ defaultMessage }: { defaultMessage: string }) {
  const [email, setEmail] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("quickpress.last_staff_email") || "";
    }
    return "";
  });
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes("@")) {
      setErrorMessage("Please enter a valid staff email address.");
      return;
    }
    setLoading(true);
    setErrorMessage("");

    try {
      const res = await fetch(`/api/auth/admin/cf-sso?email=${encodeURIComponent(cleanEmail)}`, {
        headers: { Accept: "application/json" },
        credentials: "include",
      });
      const data = await res.json().catch(() => null);

      if (res.ok && data?.token) {
        writeSession(data, "admin");
        try {
          localStorage.setItem("quickpress.last_staff_email", cleanEmail);
        } catch {}
        window.location.href = window.location.origin + "/dashboard";
        return;
      } else {
        setErrorMessage(data?.detail || "Email is not enrolled in the QuickPress Staff Directory.");
      }
    } catch {
      setErrorMessage("Network error connecting to backend. Please retry.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSignIn} className="mt-5 text-left space-y-3">
      <div>
        <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-500 mb-1.5">
          Staff / Operator Business Email
        </label>
        <input
          type="email"
          required
          autoFocus
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            if (errorMessage) setErrorMessage("");
          }}
          placeholder="e.g. staff@quickpress.online"
          className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-300 text-xs text-zinc-900 bg-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition-all font-medium"
        />
      </div>

      {errorMessage ? (
        <p className="text-xs text-rose-600 font-semibold bg-rose-50 border border-rose-200/60 rounded-xl px-3 py-2">
          {errorMessage}
        </p>
      ) : defaultMessage ? (
        <p className="text-xs text-zinc-500">
          {defaultMessage}
        </p>
      ) : null}

      <div className="flex gap-2 pt-1">
        <button
          type="submit"
          disabled={loading}
          className="flex-1 inline-flex items-center justify-center rounded-xl bg-zinc-900 hover:bg-zinc-800 active:scale-95 px-5 py-2.5 text-xs font-extrabold text-white transition-all shadow-md cursor-pointer disabled:opacity-50"
        >
          {loading ? "Verifying Staff Role..." : "Sign In to Operations Console"}
        </button>
        <button
          type="button"
          onClick={() => {
            if (typeof window !== "undefined") {
              window.location.href = window.location.origin + "/dashboard";
            }
          }}
          className="rounded-xl border border-zinc-200 bg-zinc-100 px-3.5 py-2.5 text-xs font-bold text-zinc-700 hover:bg-zinc-200 transition-all cursor-pointer"
        >
          Reload
        </button>
      </div>
    </form>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  const router = useRouter();
  const errorMsg = String(error?.message || error || "");

  // Suppress expected auth perimeter notices from polluting browser DevTools console
  if (
    import.meta.env.DEV &&
    !errorMsg.includes("perimeter authentication") &&
    !errorMsg.includes("Zero Trust") &&
    !errorMsg.includes("headers not found")
  ) {
    console.error("Root boundary caught error:", error);
  }

  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });

    // 1. If Cloudflare Access redirected with logged_out, clear storage and reload clean root
    if (typeof window !== "undefined" && window.location.search.includes("__cf_access_message=logged_out")) {
      try {
        localStorage.removeItem("admin_session");
        sessionStorage.clear();
      } catch {}
      window.location.replace("/");
      return;
    }

    // 2. Automatic recovery for stale bundle chunk / deployment mismatch errors
    if (
      errorMsg.includes("positive") ||
      errorMsg.includes("Failed to fetch dynamically imported module") ||
      errorMsg.includes("Loading chunk") ||
      errorMsg.includes("Importing a module script failed")
    ) {
      const key = "__qp_last_chunk_reload";
      const now = Date.now();
      const last = Number(sessionStorage.getItem(key) || "0");
      if (now - last > 4000) {
        sessionStorage.setItem(key, String(now));
        if ("caches" in window) {
          caches.keys().then((names) => {
            for (const name of names) caches.delete(name);
          });
        }
        window.location.href = window.location.pathname;
      }
    }
  }, [error, errorMsg]);

  // If redirecting from Cloudflare logged_out parameter, do not display error screen
  if (typeof window !== "undefined" && window.location.search.includes("__cf_access_message=logged_out")) {
    return null;
  }

  const isAuthError =
    errorMsg.includes("Cloudflare") ||
    errorMsg.includes("perimeter") ||
    errorMsg.includes("headers") ||
    errorMsg.includes("Zero Trust") ||
    errorMsg.includes("Staff") ||
    errorMsg.includes("staff") ||
    errorMsg.includes("authentication") ||
    errorMsg.includes("enrolled");

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 px-4 text-zinc-900">
      <div className="max-w-md w-full text-center p-8 bg-white rounded-3xl border border-zinc-200 shadow-xl">
        <div className="size-12 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-center mx-auto mb-4 font-black text-xl shadow-2xs">
          QP
        </div>
        <h1 className="text-xl font-black tracking-tight text-zinc-950">
          {errorMsg.includes("chunk") || errorMsg.includes("dynamically")
            ? "Updating QuickPress Admin..."
            : isAuthError
            ? "Staff Console Authentication"
            : "QuickPress Admin"}
        </h1>

        {isAuthError ? (
          <StaffLoginForm defaultMessage={error?.message || "Enter your registered staff email to access your role console."} />
        ) : (
          <>
            <p className="mt-2 text-xs text-zinc-600 break-words">
              {errorMsg.includes("chunk") || errorMsg.includes("dynamically")
                ? "A newer version of the console was deployed. Click below to load the latest console."
                : error?.message || "Click below to reload the console."}
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <button
                onClick={() => {
                  if (typeof window !== "undefined") {
                    window.location.href = window.location.origin + "/dashboard";
                  }
                }}
                className="inline-flex items-center justify-center rounded-xl bg-emerald-600 px-5 py-2.5 text-xs font-extrabold text-white transition-all hover:bg-emerald-500 active:scale-95 shadow-md shadow-emerald-600/20 cursor-pointer"
              >
                Reload Console
              </button>
            </div>
          </>
        )}
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
        href: "https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:ital,wght@0,300;0,400;0,500;0,600;0,700;0,800;0,900;1,400;1,700&family=Geist:wght@300;400;500;600;700;800;900&family=Inter:wght@400;500;600;700;800;900&display=swap",
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
    if (typeof window === "undefined") return;
    return startAdminAutoRefresh();
  }, []);

  useEffect(() => {
    import("@/api/core/onesignal").then((m) => m.initOneSignal()).catch(() => {});
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // 1. Clean Cloudflare logged_out parameter from URL without reloading
    if (window.location.search.includes("__cf_access_message=logged_out") || window.location.search.includes("logged_out")) {
      try {
        localStorage.removeItem("admin_session");
        sessionStorage.clear();
      } catch {}
      window.history.replaceState({}, document.title, window.location.pathname);
    }

    // 2. Auto-reload on stale bundle chunk after deployment
    const onPreloadError = () => {
      const key = "__qp_chunk_reload";
      const now = Date.now();
      const last = parseInt(sessionStorage.getItem(key) || "0", 10);
      if (now - last > 4000) {
        sessionStorage.setItem(key, String(now));
        window.location.reload();
      }
    };
    window.addEventListener("vite:preloadError", onPreloadError);
    return () => window.removeEventListener("vite:preloadError", onPreloadError);
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
      <Outlet />
    </QueryClientProvider>
  );
}
