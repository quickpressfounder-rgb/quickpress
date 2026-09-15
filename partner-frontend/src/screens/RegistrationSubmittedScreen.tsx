import { useNavigate } from "@tanstack/react-router";
import {
  ArrowRight,
  BadgeCheck,
  Check,
  Clock3,
  ExternalLink,
  Headphones,
  Loader2,
  Lock,
  LogOut,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Store,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { Toaster } from "@/shared/ui/sonner";

import { PartnerAuthHeader } from "../components/PartnerAuthHeader";
import { usePartnerContext } from "../context/PartnerContext";
import { partnerRoutes } from "../navigation/partner-routes";
import {
  checkPartnerVerificationStatus,
  logout,
} from "@/api/partner/partner-auth-api";

export function RegistrationSubmittedScreen() {
  const navigate = useNavigate();
  const { session, signIn, signOut } = usePartnerContext();
  const [checking, setChecking] = useState(false);
  const [isApproved, setIsApproved] = useState(Boolean(session?.isVerified));
  const [businessName, setBusinessName] = useState(
    session?.businessName || (session as any)?.name || (session as any)?.account?.name || "Your Partner Store"
  );
  const [partnerId, setPartnerId] = useState(session?.partnerId || "");
  const [lastChecked, setLastChecked] = useState<Date | null>(null);

  const [redirecting, setRedirecting] = useState(false);

  const checkStatus = useCallback(
    async (manual = false) => {
      if (redirecting) return;
      setChecking(true);
      try {
        const result = await checkPartnerVerificationStatus();
        setLastChecked(new Date());
        if (result.businessName) setBusinessName(result.businessName);
        if (result.partnerId) setPartnerId(result.partnerId);

        if (result.isVerified) {
          setIsApproved(true);
          setRedirecting(true);
          signIn({
            partnerId: result.partnerId || session?.partnerId || "",
            phone: session?.phone || "",
            email: session?.email,
            businessName: result.businessName || session?.businessName || "Your Partner Store",
            isVerified: true,
            isOnboarded: true,
          });
          toast.success("Congratulations! Your partner store is approved! Redirecting to Dashboard... 🎉");
          setTimeout(() => {
            navigate({ to: partnerRoutes.dashboard });
          }, 600);
        } else {
          setIsApproved(false);
          if (manual) {
            toast.info("Verification is in progress. The Admin team is reviewing your store.");
          }
        }
      } catch (err) {
        if (manual) {
          toast.error("Could not refresh status. Please check your network connection.");
        }
      } finally {
        setChecking(false);
      }
    },
    [session, signIn, navigate, redirecting],
  );

  useEffect(() => {
    let mounted = true;
    void checkStatus(false);

    // Continuous auto-polling every 2.5s: as soon as Admin approves, partner screen automatically transitions!
    const pollInterval = setInterval(() => {
      if (mounted && !isApproved && !redirecting) {
        void checkStatus(false);
      }
    }, 2500);

    return () => {
      mounted = false;
      clearInterval(pollInterval);
    };
  }, [checkStatus, isApproved, redirecting]);

  const handleLogout = async () => {
    try {
      await logout();
      signOut();
      navigate({ to: partnerRoutes.auth });
    } catch {
      navigate({ to: partnerRoutes.auth });
    }
  };

  const timeline = [
    {
      icon: Check,
      label: "Application Received",
      body: "Registration details & KYC submitted successfully",
      status: "done" as const,
    },
    {
      icon: isApproved ? ShieldCheck : Clock3,
      label: "Admin & Document Verification",
      body: isApproved
        ? "Documents verified & approved by QuickPress Admin"
        : "Admin team is reviewing business credentials & store details",
      status: isApproved ? ("done" as const) : ("active" as const),
    },
    {
      icon: isApproved ? BadgeCheck : Lock,
      label: "Store Live & Ready for Orders",
      body: isApproved
        ? "Your catalog & ordering are live on QuickPress"
        : "Unlocks automatically once Admin approval is granted",
      status: isApproved ? ("done" as const) : ("locked" as const),
    },
  ];

  return (
    <main className="relative min-h-screen overflow-x-hidden bg-background text-foreground">
      {/* Background ambient lighting */}
      <div className="pointer-events-none absolute -top-40 left-1/2 size-[28rem] -translate-x-1/2 rounded-full bg-primary/10 blur-3xl" />

      <div className="relative mx-auto flex min-h-screen w-full max-w-md flex-col px-5 pb-10 pt-12">
        <PartnerAuthHeader />

        {isApproved ? (
          /* ============================================================== */
          /* STATE A: APPROVED & ACTIVE                                      */
          /* ============================================================== */
          <section className="animate-slide-up stagger-1 mt-8 flex flex-col items-center text-center">
            <span className="animate-success-pop relative flex size-24 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600 shadow-soft ring-8 ring-emerald-500/10">
              <span className="absolute inset-0 animate-ping rounded-full bg-emerald-500/15" />
              <BadgeCheck className="size-12" strokeWidth={2.6} />
            </span>

            <span className="mt-5 inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-4 py-1.5 text-[0.72rem] font-black uppercase tracking-widest text-emerald-700">
              <Sparkles className="size-3.5" />
              Approved & Activated
            </span>

            <h1 className="mt-3 text-2xl font-black leading-tight tracking-tight text-foreground">
              Application Approved! 🎉
            </h1>
            <p className="mt-2 text-sm font-medium text-muted-foreground">
              <span className="font-bold text-foreground">{businessName}</span> is verified and ready to accept laundry & dry cleaning orders.
            </p>

            {partnerId ? (
              <p className="mt-2 text-[0.7rem] font-semibold text-muted-foreground">
                Partner ID · <span className="font-mono text-foreground">{partnerId}</span>
              </p>
            ) : null}
          </section>
        ) : (
          /* ============================================================== */
          /* STATE B: APPLICATION UNDER PROCESS (PENDING ADMIN APPROVAL)     */
          /* ============================================================== */
          <section className="animate-slide-up stagger-1 mt-8 flex flex-col items-center text-center">
            <div className="relative flex size-24 items-center justify-center rounded-full bg-amber-500/15 text-amber-600 shadow-soft ring-8 ring-amber-500/10">
              <span className="absolute inset-0 animate-pulse rounded-full bg-amber-500/10" />
              <Clock3 className="size-11 animate-pulse" strokeWidth={2.4} />
            </div>

            <span className="mt-5 inline-flex items-center gap-2 rounded-full bg-amber-500/15 px-4 py-1.5 text-[0.72rem] font-black uppercase tracking-widest text-amber-800">
              <Clock3 className="size-3.5" strokeWidth={2.8} />
              Application Under Process
            </span>

            <h1 className="mt-3 text-2xl font-black leading-tight tracking-tight text-foreground">
              Under Admin Verification
            </h1>
            <p className="mt-2 text-sm font-medium leading-relaxed text-muted-foreground">
              Your application for <span className="font-bold text-foreground">{businessName}</span> is submitted and queued for verification.
            </p>

            {partnerId ? (
              <div className="mt-3 inline-flex items-center gap-2 rounded-xl border border-border bg-card/60 px-3 py-1.5 text-[0.72rem] font-semibold text-muted-foreground shadow-sm">
                <Store className="size-3.5 text-primary" />
                <span>Application ID:</span>
                <span className="font-mono font-bold text-foreground">{partnerId}</span>
              </div>
            ) : null}
          </section>
        )}

        {/* Informational Callout Card */}
        {!isApproved && (
          <section className="animate-slide-up stagger-2 card-soft mt-6 border border-amber-500/25 bg-amber-500/5 p-4">
            <div className="flex items-start gap-3">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-amber-500/20 text-amber-700">
                <ShieldCheck className="size-4" strokeWidth={2.4} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-foreground">
                  Verification in Progress (24-48 Hours)
                </p>
                <p className="mt-1 text-[0.7rem] font-medium leading-relaxed text-muted-foreground">
                  Our admin team is currently auditing your KYC, shop location, and service rates. You will gain full access to the Partner Dashboard as soon as your account is approved.
                </p>
              </div>
            </div>
          </section>
        )}

        {/* Verification Timeline */}
        <section className="animate-slide-up stagger-3 card-soft mt-5 space-y-4 border border-border p-4 shadow-soft">
          <p className="text-[0.68rem] font-bold uppercase tracking-widest text-muted-foreground">
            Onboarding Progress
          </p>
          <div className="space-y-4">
            {timeline.map((item, idx) => (
              <div key={item.label} className="relative flex items-start gap-3.5">
                {idx < timeline.length - 1 && (
                  <span
                    className={`absolute left-[1.125rem] top-9 h-[calc(100%-0.5rem)] w-0.5 -translate-x-1/2 ${
                      item.status === "done" ? "bg-emerald-500/40" : "bg-border"
                    }`}
                  />
                )}
                <span
                  className={`relative z-10 flex size-9 shrink-0 items-center justify-center rounded-2xl transition-all duration-300 ${
                    item.status === "done"
                      ? "bg-emerald-500/15 text-emerald-600 ring-2 ring-emerald-500/20"
                      : item.status === "active"
                        ? "animate-pulse bg-amber-500/20 text-amber-700 ring-2 ring-amber-500/30"
                        : "bg-muted text-muted-foreground"
                  }`}
                >
                  <item.icon className="size-4" strokeWidth={2.4} />
                </span>
                <div className="min-w-0 flex-1 pt-0.5">
                  <div className="flex items-center gap-2">
                    <p className="text-xs font-bold tracking-tight text-foreground">{item.label}</p>
                    {item.status === "done" ? (
                      <span className="rounded bg-emerald-500/15 px-1.5 py-0.5 text-[0.62rem] font-black text-emerald-700">
                        COMPLETED
                      </span>
                    ) : item.status === "active" ? (
                      <span className="rounded bg-amber-500/20 px-1.5 py-0.5 text-[0.62rem] font-black text-amber-800">
                        IN REVIEW
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-0.5 text-[0.7rem] font-medium leading-relaxed text-muted-foreground">
                    {item.body}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Action Buttons Zone */}
        <div className="mt-auto pt-6 space-y-3">
          {redirecting ? (
            <button
              type="button"
              disabled
              className="flex w-full items-center justify-center gap-2.5 rounded-2xl bg-emerald-600 py-4 text-sm font-black tracking-tight text-white shadow-cta"
            >
              <Loader2 className="size-4 animate-spin" />
              Approved! Redirecting to Dashboard...
            </button>
          ) : isApproved ? (
            <button
              type="button"
              onClick={() => navigate({ to: partnerRoutes.dashboard })}
              className="ripple focus-key flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-600 py-4 text-sm font-black tracking-tight text-white shadow-cta transition-all duration-300 active:scale-[0.97]"
            >
              Go to Partner Dashboard
              <ArrowRight className="size-4" strokeWidth={2.6} />
            </button>
          ) : (
            <button
              type="button"
              disabled={checking}
              onClick={() => void checkStatus(true)}
              className="ripple focus-key flex w-full items-center justify-center gap-2.5 rounded-2xl bg-primary py-4 text-sm font-black tracking-tight text-primary-foreground shadow-cta transition-all duration-300 active:scale-[0.97] disabled:opacity-60"
            >
              {checking ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <RefreshCw className="size-4" strokeWidth={2.4} />
              )}
              {checking ? "Checking Approval Status..." : "Check Verification Status"}
            </button>
          )}

          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={() => navigate({ to: partnerRoutes.notifications })}
              className="ripple focus-key flex items-center justify-center gap-2 rounded-2xl border border-border bg-card py-3 text-xs font-bold tracking-tight text-foreground shadow-soft transition-all duration-300 active:scale-[0.97]"
            >
              <Headphones className="size-3.5" strokeWidth={2.4} />
              Support
            </button>

            <button
              type="button"
              onClick={() => void handleLogout()}
              className="ripple focus-key flex items-center justify-center gap-2 rounded-2xl border border-border bg-card py-3 text-xs font-bold tracking-tight text-destructive shadow-soft transition-all duration-300 active:scale-[0.97]"
            >
              <LogOut className="size-3.5" strokeWidth={2.4} />
              Sign Out
            </button>
          </div>

          {lastChecked ? (
            <p className="text-center text-[0.65rem] font-medium text-muted-foreground">
              Last checked at {lastChecked.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
            </p>
          ) : null}
        </div>
      </div>
      <Toaster />
    </main>
  );
}
