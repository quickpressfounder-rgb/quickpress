import { createFileRoute } from "@tanstack/react-router";
import { ShieldAlert, LogOut, RefreshCw, CheckCircle2, ShieldCheck, Mail } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { adminHead } from "../lib/head";

export const Route = createFileRoute("/unauthorized")({
  ssr: false,
  head: () => adminHead("Perimeter Access Denied", "QuickPress Staff Security Perimeter"),
  component: UnauthorizedPage,
});

export function UnauthorizedPage() {
  const handleLogout = () => {
    try {
      localStorage.removeItem("admin_session");
      sessionStorage.clear();
    } catch {
      /* ignore storage clear error */
    }
    // Redirect to Cloudflare Access logout endpoint to clear perimeter cookie
    window.location.href = "/cdn-cgi/access/logout";
  };

  const handleRetry = () => {
    window.location.href = "/";
  };

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
          <p className="mt-1 text-xs text-slate-500">
            Zero Trust Perimeter Access Control
          </p>
        </div>

        {/* Clean Security Notice Card */}
        <div className="overflow-hidden rounded-3xl border border-slate-200/90 bg-white shadow-xl shadow-slate-200/60 p-6 sm:p-8 space-y-6">
          <div className="text-center space-y-3">
            <div className="inline-flex items-center justify-center size-16 rounded-2xl bg-rose-50 border border-rose-200 text-rose-600 shadow-2xs">
              <ShieldAlert className="size-8 text-rose-600" />
            </div>

            <div>
              <h2 className="text-lg font-black text-slate-950 tracking-tight">
                Perimeter Access Verified
              </h2>
              <p className="text-xs text-rose-700 font-bold mt-0.5">
                Staff Account Not Enrolled in Directory
              </p>
            </div>
          </div>

          <div className="rounded-2xl bg-slate-50 border border-slate-200 p-4 space-y-2.5 text-xs text-slate-600">
            <div className="flex items-center gap-2 font-bold text-slate-800">
              <CheckCircle2 className="size-4 text-emerald-600 shrink-0" />
              <span>Cloudflare Zero Trust: Verified</span>
            </div>
            <p className="text-[11px] leading-relaxed text-slate-500">
              Your email was verified by Cloudflare Access OTP. However, this email has not been granted an operational role in the QuickPress Staff Directory.
            </p>
            <div className="pt-2 border-t border-slate-200 text-[11px] text-slate-500">
              To obtain access, please ask your <strong>Super Administrator</strong> to enroll your official corporate email in the Staff Management console.
            </div>
          </div>

          <div className="space-y-2.5 pt-2">
            <Button
              onClick={handleRetry}
              className="w-full h-11 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-xl gap-2 shadow-xs cursor-pointer"
            >
              <RefreshCw className="size-4" />
              <span>Retry Verification</span>
            </Button>

            <Button
              onClick={handleLogout}
              variant="outline"
              className="w-full h-11 border-zinc-300 hover:bg-zinc-100 text-zinc-700 font-bold text-xs rounded-xl gap-2 cursor-pointer shadow-2xs"
            >
              <LogOut className="size-4" />
              <span>Switch Cloudflare Account / Logout</span>
            </Button>
          </div>
        </div>

        <p className="text-center text-[11px] text-zinc-400 mt-6">
          Protected by Cloudflare Zero Trust Perimeter Security &amp; End-to-End Audit Trail.
        </p>
      </div>
    </div>
  );
}

