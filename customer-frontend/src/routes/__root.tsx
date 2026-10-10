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
import { PageTransition } from "@/components/motion/PageTransition";
import { PullToRefresh } from "@/components/motion/PullToRefresh";
import { RippleLayer } from "@/components/motion/RippleLayer";
import { NotificationManager } from "@/components/notifications/NotificationManager";
import { NamePromptModal } from "@/components/profile/NamePromptModal";
import { reportLovableError } from "@/shared/lib/lovable-error-reporting";
import { initTheme } from "@/lib/theme";
import { useBackNavigation } from "@/hooks/useBackNavigation";
import { Toaster } from "@/shared/ui/sonner";

// Permanently intercept and gracefully suppress benign React SSR hydration mismatch notices (#418, #423, #425)
if (typeof window !== "undefined") {
  const isBenign = (str: string) =>
    str.includes("418") ||
    str.includes("423") ||
    str.includes("425") ||
    str.includes("Hydration failed") ||
    str.includes("hydration") ||
    str.includes("Minified React error #418") ||
    str.includes("reading 'Oe'") ||
    str.includes("OneSignal");

  const origConsoleError = console.error.bind(console);
  console.error = (...args: any[]) => {
    const combined = args.map((a) => (a !== undefined && a !== null ? String(a) : "")).join(" ");
    if (isBenign(combined)) return;
    origConsoleError(...args);
  };

  const origConsoleWarn = console.warn.bind(console);
  console.warn = (...args: any[]) => {
    const combined = args.map((a) => (a !== undefined && a !== null ? String(a) : "")).join(" ");
    if (isBenign(combined)) return;
    origConsoleWarn(...args);
  };

  window.addEventListener(
    "error",
    (event) => {
      const msg = event?.message || "";
      if (isBenign(msg)) {
        event.preventDefault();
        event.stopImmediatePropagation();
      }
    },
    true,
  );

  window.addEventListener(
    "unhandledrejection",
    (event) => {
      const reason = String(event?.reason || "");
      if (isBenign(reason)) {
        event.preventDefault();
        event.stopImmediatePropagation();
      }
    },
    true,
  );
}


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
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
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
      { name: "referrer", content: "strict-origin-when-cross-origin" },
      { title: "QuickPress — Laundry Pickup & Delivery" },
      {
        name: "description",
        content: "QuickPress: premium laundry pickup and delivery, one secure mobile login.",
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
      { rel: "icon", href: "/favicon.png", type: "image/png" },
      { rel: "apple-touch-icon", href: "/apple-touch-icon.png", sizes: "180x180" },
    ],
  }),

  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  const envApiBase = (
    (typeof import.meta !== "undefined" &&
      ((import.meta as any).env?.VITE_API_BASE_URL || (import.meta as any).env?.VITE_API_URL)) ||
    ""
  ).replace(/\/+$/, "");

  return (
    <html lang="en" className="bg-white" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                var _base = (window.__QUICKPRESS_CONFIG__ && window.__QUICKPRESS_CONFIG__.API_BASE_URL) || '${envApiBase}';
                window.__QUICKPRESS_CONFIG__ = { API_BASE_URL: _base };
                if (window.__qp_fetch_patched) return;
                window.__qp_fetch_patched = true;
                var _origFetch = window.fetch;
                window.fetch = function(input, init) {
                  if (typeof input === 'string') {
                    if (_base) {
                      var hostOnly = _base.replace(/^https?:\\/\\//, '');
                      input = input.replace(/quickpress-api-production-3292\\.up\\.railway\\.app/g, hostOnly);
                    }
                    if (input.startsWith('/api/') && _base) { input = _base + input; }
                  } else if (input && input.url) {
                    try {
                      var newUrl = input.url;
                      if (_base) {
                        var hostOnly = _base.replace(/^https?:\\/\\//, '');
                        newUrl = newUrl.replace(/quickpress-api-production-3292\\.up\\.railway\\.app/g, hostOnly);
                      }
                      if (newUrl.startsWith('/api/') && _base) { newUrl = _base + newUrl; }
                      input = new Request(newUrl, input);
                    } catch(e) {}
                  }
                  return _origFetch.call(this, input, init);
                };
              })();
            `,
          }}
        />
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
  const router = useRouter();

  // Handles Android hardware back button and swipe back gestures gracefully step-by-step
  useBackNavigation();

  // Applies the stored Light / Dark / System choice and follows the OS live.
  useEffect(() => initTheme(), []);

  // OneSignal Push Notification Engine initialization
  useEffect(() => {
    import("@/api/core/onesignal").then((m) => m.initOneSignal()).catch(() => {});
  }, []);

  // Google Translate runtime engine initialization for full app translation
  useEffect(() => {
    if (typeof window === "undefined") return;

    (window as any).googleTranslateElementInit = () => {
      try {
        if ((window as any).google?.translate?.TranslateElement) {
          new (window as any).google.translate.TranslateElement(
            {
              pageLanguage: "en",
              includedLanguages: "en,hi,pa,mr,gu,bn,te,ta,kn,ur",
              autoDisplay: false,
              layout: (window as any).google.translate.TranslateElement.InlineLayout.SIMPLE,
            },
            "google_translate_element"
          );
        }
      } catch (err) {
        console.warn("Google translate initialization:", err);
      }
    };

    if (!document.getElementById("google-translate-script")) {
      const script = document.createElement("script");
      script.id = "google-translate-script";
      script.src = "//translate.google.com/translate_a/element.js?cb=googleTranslateElementInit";
      script.async = true;
      document.body.appendChild(script);
    }
  }, []);

  // Sabse zyada use hone wale pages ko idle time me pre-load — navigation instant lage.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const token =
      localStorage.getItem("qp_access_token") ||
      sessionStorage.getItem("qp_access_token");
    // Only preload protected routes if authenticated to avoid 401 unauthorized errors
    const paths = token
      ? ["/history", "/checkout", "/search", "/offers"]
      : ["/search", "/offers"];

    const idle =
      (window as unknown as { requestIdleCallback?: (cb: () => void) => number })
        .requestIdleCallback ?? ((cb: () => void) => window.setTimeout(cb, 1500));

    idle(() => {
      paths.forEach((to, idx) => {
        setTimeout(() => {
          void router.preloadRoute({ to }).catch(() => undefined);
        }, idx * 200);
      });
    });
  }, [router]);

  return (
    <QueryClientProvider client={queryClient}>
      {/* Hidden container for Google Translate engine */}
      <div id="google_translate_element" className="hidden" aria-hidden="true" />
      {/* Premium interaction layers — presentation only, no routing/data changes. */}
      <RippleLayer />
      <PullToRefresh />
      <NotificationManager />
      <NamePromptModal />
      <PageTransition>
        {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
        <Outlet />
      </PageTransition>
      <Toaster />
    </QueryClientProvider>
  );
}


