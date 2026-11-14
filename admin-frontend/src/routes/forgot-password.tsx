import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { Shield, ShieldCheck, ArrowRight } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/card";
import { adminHead } from "../lib/head";

export const Route = createFileRoute("/forgot-password")({
  ssr: false,
  beforeLoad: () => {
    if (typeof window !== "undefined") {
      throw redirect({ to: "/" });
    }
  },
  head: () => adminHead("Passwordless Authentication", "QuickPress Zero Trust Security Perimeter"),
  component: ForgotPasswordPage,
});

function ForgotPasswordPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-6 flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-600 text-white shadow-lg">
            <ShieldCheck className="h-6 w-6" />
          </span>
          <div>
            <p className="text-base font-bold text-slate-900">QuickPress Operations</p>
            <p className="text-xs text-slate-500">Cloudflare Zero Trust SSO</p>
          </div>
        </div>

        <Card className="rounded-2xl border-slate-200 shadow-lg">
          <CardHeader>
            <CardTitle className="text-lg font-black text-slate-900">Passwordless Staff Access</CardTitle>
            <CardDescription className="text-xs text-slate-500">
              Passwords have been decommissioned in favor of high-security Cloudflare Zero Trust email OTP.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-xs text-slate-600 leading-relaxed">
              To sign in, simply access the portal and complete the Cloudflare Access verification with your authorized corporate email.
            </p>
            <Button asChild className="w-full bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-xl gap-2">
              <Link to="/">
                <span>Return to Operations Console</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}