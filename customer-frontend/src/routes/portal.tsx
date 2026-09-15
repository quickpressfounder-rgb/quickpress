import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  CheckCircle2,
  ExternalLink,
  Layers,
  Radio,
  Server,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Truck,
  Zap,
} from "lucide-react";
import { getPanelUrls } from "../lib/panel-urls";

export const Route = createFileRoute("/portal")({
  head: () => ({
    meta: [
      { title: "QuickPress Multi-Panel Launchpad — Ecosystem Hub" },
      {
        name: "description",
        content:
          "Official Multi-Panel Portal for QuickPress: Customer Storefront, Partner Console, Rider Delivery Fleet & Admin Control Center.",
      },
    ],
  }),
  component: PortalHubScreen,
});

const ICONS = {
  ShoppingBag,
  Building2,
  Truck,
  ShieldCheck,
};

function PortalHubScreen() {
  const panels = getPanelUrls("customer");

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 selection:bg-emerald-500 selection:text-white">
      {/* Top Banner */}
      <header className="sticky top-0 z-30 border-none bg-white/90 backdrop-blur-md rounded-b-2xl sm:rounded-b-3xl shadow-[0_3px_12px_-2px_rgba(0,0,0,0.06)]">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <Link
              to="/home"
              className="flex size-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 active:scale-95 transition-all shadow-xs"
              aria-label="Back to Customer Home"
            >
              <ArrowLeft className="size-4" />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-black text-lg tracking-tight">QuickPress</span>
                <span className="rounded-full bg-emerald-100 border border-emerald-200 px-2 py-0.5 text-[10px] font-black text-emerald-800 uppercase tracking-wider">
                  Ecosystem Hub
                </span>
              </div>
              <p className="text-[11px] font-semibold text-slate-500">
                Unified Multi-Panel Architecture & Access
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full bg-slate-100 border border-slate-200 px-2.5 py-1 text-xs font-bold text-slate-700">
              <Radio className="size-3 text-emerald-600 animate-pulse" />
              4 Panels Connected
            </span>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 space-y-8">
        {/* Hero Section */}
        <div className="rounded-3xl border border-slate-200/80 bg-linear-to-br from-white via-slate-50 to-emerald-50/40 p-6 sm:p-8 shadow-sm">
          <div className="max-w-2xl">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-600 text-white px-3 py-1 text-xs font-black tracking-wide">
              <Sparkles className="size-3.5" />
              QUICKPRESS SUITE
            </span>
            <h1 className="mt-4 text-2xl sm:text-4xl font-black tracking-tight text-slate-900">
              All 4 QuickPress Applications in One Unified Place
            </h1>
            <p className="mt-3 text-sm sm:text-base font-medium text-slate-600 leading-relaxed">
              QuickPress operates on a dedicated multi-panel system engineered for real-time laundry logistics: Customer storefront, Partner vendor workstation, Rider fleet dispatch, and Super Admin command headquarters.
            </p>
          </div>
        </div>

        {/* 4 Panels Grid */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          {panels.map((panel) => {
            const Icon = ICONS[panel.iconName];
            return (
              <div
                key={panel.id}
                className="flex flex-col justify-between rounded-3xl border border-slate-200 bg-white p-6 shadow-sm hover:border-slate-300 hover:shadow-md transition-all duration-200"
              >
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div
                      className={`flex size-12 items-center justify-center rounded-2xl ${panel.bgLight} ${panel.themeColor}`}
                    >
                      <Icon className="size-6" />
                    </div>
                    <span className="rounded-full bg-slate-100 border border-slate-200 px-3 py-1 text-xs font-black text-slate-700">
                      {panel.badge}
                    </span>
                  </div>

                  <h2 className="mt-4 text-lg font-black text-slate-900">
                    {panel.name}
                  </h2>
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Target: {panel.role}
                  </p>

                  <p className="mt-2.5 text-xs sm:text-sm font-medium text-slate-600 leading-relaxed">
                    {panel.description}
                  </p>
                </div>

                <div className="mt-6 border-t border-slate-100 pt-4 flex items-center justify-between gap-3">
                  <div className="text-[11px] font-mono text-slate-500">
                    Dev Port: <strong className="text-slate-800">{panel.devPort}</strong>
                  </div>

                  <a
                    href={panel.url}
                    target={panel.isCurrent ? "_self" : "_blank"}
                    rel="noreferrer"
                    className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-black transition-all active:scale-95 shadow-xs ${
                      panel.isCurrent
                        ? "bg-slate-900 text-white hover:bg-slate-800"
                        : "bg-emerald-600 text-white hover:bg-emerald-700"
                    }`}
                  >
                    <span>{panel.isCurrent ? "Active (You are here)" : "Open Panel"}</span>
                    <ExternalLink className="size-3.5" />
                  </a>
                </div>
              </div>
            );
          })}
        </div>

        {/* Architecture Specs */}
        <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm space-y-4">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
            <div className="flex size-10 items-center justify-center rounded-xl bg-purple-50 text-purple-600">
              <Server className="size-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900">Architecture & Single Source of Truth</h3>
              <p className="text-xs font-medium text-slate-500">FastAPI + MongoDB Atlas + WebSocket Real-time Cluster</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
            <div className="rounded-2xl bg-slate-50 p-4 border border-slate-200/70">
              <div className="flex items-center gap-2 text-emerald-700 font-bold text-xs">
                <CheckCircle2 className="size-4" />
                <span>Single Shared Database</span>
              </div>
              <p className="mt-1 text-xs text-slate-600">
                All 4 apps read and write to the same MongoDB collections. Changes in Partner/Rider reflect instantly for Customers and Admin.
              </p>
            </div>

            <div className="rounded-2xl bg-slate-50 p-4 border border-slate-200/70">
              <div className="flex items-center gap-2 text-blue-700 font-bold text-xs">
                <CheckCircle2 className="size-4" />
                <span>Live Socket.IO Sync</span>
              </div>
              <p className="mt-1 text-xs text-slate-600">
                Order status updates, live rider GPS telemetry, and push notifications broadcast seamlessly across all 4 panels.
              </p>
            </div>

            <div className="rounded-2xl bg-slate-50 p-4 border border-slate-200/70">
              <div className="flex items-center gap-2 text-purple-700 font-bold text-xs">
                <CheckCircle2 className="size-4" />
                <span>Role-Based JWT Security</span>
              </div>
              <p className="mt-1 text-xs text-slate-600">
                Independent authentication guards protect Customer, Partner, Rider, and Admin endpoints.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
