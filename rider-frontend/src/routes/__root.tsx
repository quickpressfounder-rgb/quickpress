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
import { RiderProvider } from "../context/RiderContext";
import { LanguageProvider } from "../lib/i18n";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-white px-4">
      <div className="max-w-md text-center">
        <h1 className="text-6xl font-black text-slate-900">404</h1>
        <h2 className="mt-2 text-lg font-bold text-slate-700">Page not found</h2>
        <p className="mt-1 text-xs text-slate-500">
          The screen you are looking for does not exist.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-xl bg-amber-400 px-4 py-2 text-xs font-black text-slate-950 shadow-sm transition-all hover:bg-amber-500 active:scale-95"
          >
            Go to Start
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();

  return (
    <div className="flex min-h-screen items-center justify-center bg-white px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-bold text-slate-900">Something went wrong</h1>
        <p className="mt-1 text-xs text-slate-500">
          An error occurred while loading this page.
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <button
            type="button"
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="rounded-xl bg-amber-400 px-4 py-2 text-xs font-black text-slate-950 shadow-sm transition-all hover:bg-amber-500 active:scale-95"
          >
            Try again
          </button>
          <Link
            to="/"
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 shadow-sm transition-all hover:bg-slate-50 active:scale-95"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      {
        name: "viewport",
        content:
          "width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover",
      },
      { name: "theme-color", content: "#064e3b" },
      { name: "mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-status-bar-style", content: "default" },
      { title: "QuickPress Captain" },
      { name: "description", content: "QuickPress Captain Delivery Partner App" },
    ],
    links: [
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&family=Inter:wght@400;500;600;700;800;900&display=swap",
      },
      {
        rel: "stylesheet",
        href: appCss,
      },
      { rel: "icon", href: "/favicon.ico", type: "image/x-icon" },
    ],
    scripts: [
      ...(typeof import.meta !== "undefined" &&
      (import.meta as any).env?.VITE_ONESIGNAL_APP_ID &&
      !(import.meta as any).env?.VITE_ONESIGNAL_APP_ID.includes("184bda82")
        ? [
            {
              src: "https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js",
              defer: true,
            },
          ]
        : []),
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
        <script
          dangerouslySetInnerHTML={{
            __html: `
              window.__QUICKPRESS_CONFIG__ = { API_BASE_URL: 'https://quickpress-api-production.up.railway.app' };
              (function() {
                if (window.__qp_fetch_patched) return;
                window.__qp_fetch_patched = true;
                var _origFetch = window.fetch;
                window.fetch = function(input, init) {
                  if (typeof input === 'string') {
                    input = input.replace(/quickpress-api-production-3292\\.up\\.railway\\.app/g, 'quickpress-api-production.up.railway.app');
                    if (input.startsWith('/api/')) { input = 'https://quickpress-api-production.up.railway.app' + input; }
                  } else if (input && input.url) {
                    try {
                      var newUrl = input.url.replace(/quickpress-api-production-3292\\.up\\.railway\\.app/g, 'quickpress-api-production.up.railway.app');
                      if (newUrl.startsWith('/api/')) { newUrl = 'https://quickpress-api-production.up.railway.app' + newUrl; }
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
      <body
        className="min-h-screen bg-white text-slate-950 antialiased selection:bg-amber-400 selection:text-black"
        suppressHydrationWarning
      >
        <div className="min-h-dvh bg-white relative overflow-x-hidden">
          {children}
        </div>
        <Scripts />
      </body>
    </html>
  );
}

import { GlobalOrderDispatchListener } from "@/components/orders/GlobalOrderDispatchListener";
import { CapacitorBackHandler } from "@/components/common/CapacitorBackHandler";
import { Toaster } from "@/shared/ui/sonner";
import { installGlobalAudioUnlocker } from "@/lib/captain-audio";

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  useEffect(() => {
    installGlobalAudioUnlocker();
    import("@/api/core/onesignal").then((m) => m.initOneSignal()).catch(() => {});
    import("@/api/core/firebase-messaging").then((m) => {
      m.requestPushNotificationPermission();
      m.setupForegroundMessageListener();
    }).catch(() => {});
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <LanguageProvider>
        <RiderProvider>
          <CapacitorBackHandler />
          <GlobalOrderDispatchListener />
          <Outlet />
          <Toaster />
        </RiderProvider>
      </LanguageProvider>
    </QueryClientProvider>
  );
}
