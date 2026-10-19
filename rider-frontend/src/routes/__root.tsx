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
import {
  AlertTriangle,
  RotateCcw,
  Home,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Copy,
  Check,
} from "lucide-react";

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
  const [showStack, setShowStack] = useState(false);
  const [copied, setCopied] = useState(false);

  const errorMessage =
    error?.message ||
    (typeof error === "string" ? error : "An error occurred while loading this page.");

  const handleFullReset = () => {
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch {}
    window.location.href = "/";
  };

  const handleCopy = () => {
    try {
      const text = `${error?.name || "Error"}: ${errorMessage}\n\nStack:\n${error?.stack || "No stack trace available"}`;
      navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-white px-4 py-8 select-none text-slate-900">
      <div className="w-full max-w-md text-center">
        {/* Warning Icon Badge */}
        <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-amber-50 text-amber-500 border border-amber-200 shadow-sm mb-4">
          <AlertTriangle className="size-7 stroke-[2.2]" />
        </div>

        <h1 className="text-xl font-black text-slate-900">Something went wrong</h1>
        <p className="mt-1 text-xs text-slate-500">
          An error occurred while loading this page.
        </p>

        {/* Clean Diagnostic Box */}
        <div className="mt-4 p-3 bg-slate-50 border border-slate-200 rounded-xl text-left">
          <p className="text-[11px] font-mono text-rose-700 break-words font-medium">
            {errorMessage}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="mt-5 flex flex-col gap-2.5">
          <div className="flex justify-center gap-2.5">
            <button
              type="button"
              onClick={() => {
                router.invalidate();
                reset();
              }}
              className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-amber-400 px-4 py-2.5 text-xs font-black text-slate-950 shadow-sm transition-all hover:bg-amber-500 active:scale-95"
            >
              <RotateCcw className="size-3.5 stroke-[2.5]" />
              <span>Try again</span>
            </button>
            <Link
              to="/"
              className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 shadow-sm transition-all hover:bg-slate-50 active:scale-95"
            >
              <Home className="size-3.5 stroke-[2]" />
              <span>Go home</span>
            </Link>
          </div>

          <button
            type="button"
            onClick={handleFullReset}
            className="w-full inline-flex items-center justify-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50/70 px-4 py-2 text-xs font-bold text-rose-700 hover:bg-rose-100 active:scale-95 transition-all"
          >
            <RefreshCw className="size-3.5 stroke-[2]" />
            <span>Reset Cache & Re-login</span>
          </button>
        </div>

        {/* Collapsible Tech Details */}
        {error?.stack && (
          <div className="mt-5 text-left border-t border-slate-150 pt-4">
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => setShowStack(!showStack)}
                className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-500 hover:text-slate-800"
              >
                <span>Diagnostic details</span>
                {showStack ? (
                  <ChevronUp className="size-3" />
                ) : (
                  <ChevronDown className="size-3" />
                )}
              </button>
              <button
                type="button"
                onClick={handleCopy}
                className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-500 hover:text-slate-800 px-2 py-0.5 rounded bg-slate-100"
              >
                {copied ? <Check className="size-3 text-emerald-600" /> : <Copy className="size-3" />}
                <span>{copied ? "Copied" : "Copy"}</span>
              </button>
            </div>
            {showStack && (
              <pre className="mt-2 max-h-40 overflow-auto rounded-lg bg-slate-900 p-3 font-mono text-[10px] text-slate-200 leading-relaxed whitespace-pre-wrap">
                {error.stack}
              </pre>
            )}
          </div>
        )}
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
