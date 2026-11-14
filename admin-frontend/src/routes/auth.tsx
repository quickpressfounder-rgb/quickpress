import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  ShieldCheck,
  RefreshCw,
  Cloud,
  ArrowRight,
  LogOut,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/shared/ui/button";

import {
  restoreAdminSession,
  authenticateCloudflareZeroTrust,
} from "../api/auth";
import { adminRoutes } from "../navigation/admin-routes";
import { adminHead } from "../lib/head";

export const Route = createFileRoute("/auth")({
  head: () => adminHead("Cloudflare Zero Trust Authentication", "QuickPress Staff Portal"),
  component: AdminAuthPage,
});

export function AdminAuthPage() {
  const navigate = useNavigate();
  const [statusText, setStatusText] = useState("Verifying Cloudflare Zero Trust Perimeter Identity...");
  const isDev = Boolean(
    import.meta.env.DEV ||
    (typeof window !== "undefined" && (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"))
  );

  useEffect(() => {
    let active = true;

    async function verifyAndRedirect() {
      // Step 1: Check existing valid local session
      try {
        const localSession = await restoreAdminSession();
        if (active && localSession?.token) {
          navigate({ to: adminRoutes.dashboard });
          return;
        }
      } catch {
        /* proceed to Cloudflare SSO handshake */
      }

      // Step 2: Perform Cloudflare Zero Trust Perimeter Handshake
      try {
        const cfSession = await authenticateCloudflareZeroTrust();
        if (!active) return;
        toast.success(`Cloudflare Verified: Welcome, ${cfSession.account?.name || "Administrator"}!`);
        navigate({ to: adminRoutes.dashboard });
      } catch (err: any) {
        if (!active) return;
        const status = err?.status;
        const msg = String(err?.message || "");

        // 403 Forbidden: Email authenticated by Cloudflare, but not in admin_staff directory
        if (status === 403 || msg.includes("Staff Directory") || msg.includes("enrolled")) {
          navigate({ to: adminRoutes.unauthorized });
          return;
        }

        if (isDev) {
          setStatusText("Local Development Mode (Cloudflare Access Not Active)");
          return;
        }

        // Retry in 2 seconds if origin sync or transient network issue
        setStatusText("Connecting to perimeter gateway... Auto-detecting in 2s.");
        setTimeout(() => {
          if (active) void verifyAndRedirect();
        }, 2000);
      }
    }

    void verifyAndRedirect();
    return () => {
      active = false;
    };
  }, [navigate, isDev]);

  return (
    <div className="relative min-h-screen w-full bg-slate-50 font-sans text-slate-900 selection:bg-emerald-600 selection:text-white flex items-center justify-center p-4 sm:p-6 lg:p-8">
      {/* Subtle Background Pattern */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] [background-size:20px_20px] opacity-70" />

      <div className="relative z-10 w-full max-w-md">
        {/* Brand Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center size-14 rounded-2xl bg-emerald-600 text-white shadow-lg shadow-emerald-600/20 mb-3.5">
            <ShieldCheck className="size-7" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900">
            QuickPress Operations
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-slate-500">
            Protected by Cloudflare Zero Trust Perimeter Access
          </p>
        </div>

        {/* Clean Security Handshake Card */}
        <div className="overflow-hidden rounded-3xl border border-slate-200/90 bg-white shadow-xl shadow-slate-200/60 p-6 sm:p-9 text-center space-y-4">
          <div className="relative inline-flex items-center justify-center">
            <div className="size-16 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-center shadow-inner">
              <Cloud className="size-8 text-emerald-600 animate-pulse" />
            </div>
            <div className="absolute -bottom-1 -right-1 size-6 rounded-full bg-emerald-600 text-white flex items-center justify-center shadow-md">
              <ShieldCheck className="size-3.5" />
            </div>
          </div>

          <div>
            <h3 className="text-base font-black text-slate-900">Cloudflare Zero Trust SSO</h3>
            <p className="mt-1 text-xs text-slate-500 max-w-xs mx-auto leading-relaxed">
              {statusText}
            </p>
          </div>

          <div className="flex items-center justify-center gap-2 pt-2 text-xs font-semibold text-emerald-700">
            <RefreshCw className="size-3.5 animate-spin text-emerald-600" />
            <span>Establishing Secure Session...</span>
          </div>

          {isDev && (
            <div className="pt-4 border-t border-slate-100 space-y-2">
              <p className="text-[11px] text-zinc-400">
                You are running on localhost outside Cloudflare.
              </p>
              <Button
                onClick={() => navigate({ to: adminRoutes.dashboard })}
                className="w-full h-9 bg-zinc-900 hover:bg-zinc-800 text-white font-bold text-xs rounded-xl gap-2 cursor-pointer shadow-xs"
              >
                <span>Continue to Local Admin Console</span>
                <ArrowRight className="size-3.5" />
              </Button>
            </div>
          )}
        </div>

        <p className="text-center text-[11px] text-zinc-400 mt-6">
          Zero Passwords Required • Direct Cloudflare Email OTP Authentication
        </p>
      </div>
    </div>
  );
}
