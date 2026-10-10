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

import appCss from "../styles.css?url";
import { reportLovableError } from "@/shared/lib/lovable-error-reporting";
import { configureSessionRole } from "../api/core/session-store";
import { initTheme } from "../lib/theme";
import { PartnerProvider } from "../context/PartnerContext";
import { PartnerOrdersProvider } from "../context/PartnerOrdersContext";
import { PartnerServicesProvider } from "../context/PartnerServicesContext";
import { PartnerShopProvider } from "../context/PartnerShopContext";
import { LanguageProvider } from "../lib/i18n";
import { LanguageSelectionModal } from "../components/common/LanguageSelectionModal";
import { useBackNavigation } from "../hooks/useBackNavigation";

configureSessionRole("partner");

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
      { title: "QuickPress Partner — Store Console" },
      {
        name: "description",
        content: "Manage QuickPress orders, services, earnings and payouts from one partner console.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: appCss,
      },
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
  const envApiBase =
    (typeof process !== "undefined" && process.env?.VITE_API_BASE_URL) ||
    (typeof import.meta !== "undefined" && import.meta.env?.VITE_API_BASE_URL) ||
    "https://quickpress-api-production.up.railway.app";

  return (
    <html lang="en" className="bg-background text-foreground" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              window.__QUICKPRESS_CONFIG__ = { API_BASE_URL: '${envApiBase}' };
              (function() {
                if (window.__qp_fetch_patched) return;
                window.__qp_fetch_patched = true;
                var _origFetch = window.fetch;
                var _base = '${envApiBase}';
                window.fetch = function(input, init) {
                  if (typeof input === 'string') {
                    input = input.replace(/quickpress-api-production-3292\\.up\\.railway\\.app/g, 'quickpress-api-production.up.railway.app');
                    if (input.startsWith('/api/')) { input = _base + input; }
                  } else if (input && input.url) {
                    try {
                      var newUrl = input.url.replace(/quickpress-api-production-3292\\.up\\.railway\\.app/g, 'quickpress-api-production.up.railway.app');
                      if (newUrl.startsWith('/api/')) { newUrl = _base + newUrl; }
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
      <body className="min-h-screen bg-background text-foreground antialiased selection:bg-primary/20" suppressHydrationWarning>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  // Initialize theme runtime (strictly defaults to light)
  useEffect(() => {
    return initTheme();
  }, []);

  // Handles Android hardware back button and swipe back gestures gracefully step-by-step
  useBackNavigation();

  useEffect(() => {
    import("@/api/core/onesignal").then((m) => m.initOneSignal()).catch(() => {});
    import("@/api/core/firebase-messaging").then((m) => {
      m.requestPushNotificationPermission();
      m.setupForegroundMessageListener();
    }).catch(() => {});
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <LanguageProvider>
        <PartnerProvider>
          <PartnerOrdersProvider>
            <PartnerServicesProvider>
              <PartnerShopProvider>
                {/* Global Language Selection Onboarding Screen */}
                <LanguageSelectionModal />
                {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
                <Outlet />
              </PartnerShopProvider>
            </PartnerServicesProvider>
          </PartnerOrdersProvider>
        </PartnerProvider>
      </LanguageProvider>
    </QueryClientProvider>
  );
}
