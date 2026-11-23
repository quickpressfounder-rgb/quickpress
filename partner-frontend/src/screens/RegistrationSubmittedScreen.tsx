import { useNavigate } from "@tanstack/react-router";
import {
  AlertTriangle,
  ArrowRight,
  BadgeCheck,
  Check,
  Clock3,
  Edit3,
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
  resendPartnerAgreementEmail,
} from "@/api/partner/partner-auth-api";
import { formatPartnerId } from "../lib/format-ids";
import { isPartnerApproved } from "../lib/auth-guard";

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
  const [rejectionReason, setRejectionReason] = useState<string | null>(null);
  const [isResubmitted, setIsResubmitted] = useState(false);
  const [resubmittedAt, setResubmittedAt] = useState<string | null>(null);
  const [kycStatus, setKycStatus] = useState<string>("pending");
  const [agreementStatus, setAgreementStatus] = useState<string>("PENDING_SIGNATURE");
  const [agreementApproved, setAgreementApproved] = useState<boolean>(false);
  const [agreementToken, setAgreementToken] = useState<string>("");
  const [resendingAgreement, setResendingAgreement] = useState(false);

  const checkStatus = useCallback(
    async (manual = false) => {
      if (redirecting) return;
      setChecking(true);
      try {
        const result = await checkPartnerVerificationStatus();
        setLastChecked(new Date());
        if (result.isOnboarded === false && !result.isVerified) {
          navigate({ to: partnerRoutes.registration });
          return;
        }
        if (result.businessName) setBusinessName(result.businessName);
        if (result.partnerId) setPartnerId(result.partnerId);
        if (result.rejectionReason) setRejectionReason(result.rejectionReason);
        if (result.resubmitted) setIsResubmitted(true);
        if (result.resubmittedAt) setResubmittedAt(result.resubmittedAt);
        if (result.kycStatus) setKycStatus(result.kycStatus);
        if (result.agreementStatus) setAgreementStatus(result.agreementStatus);
        if (typeof result.agreementApproved === "boolean") setAgreementApproved(result.agreementApproved);
        if (result.agreementToken) setAgreementToken(result.agreementToken);

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
          navigate({ to: partnerRoutes.dashboard, replace: true });
        } else {
          setIsApproved(false);
          if (manual) {
            if (result.kycStatus === "rejected" || result.rejectionReason) {
              toast.error("Application rejected / update required by Admin. Please re-submit documents.");
            } else if (result.agreementStatus !== "APPROVED") {
              toast.info("Please review and sign your Master Merchant Agreement sent to your email.");
            } else {
              toast.info("Verification is in progress. The Admin team is reviewing your store.");
            }
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

  const handleResendAgreement = async () => {
    setResendingAgreement(true);
    try {
      const res = await resendPartnerAgreementEmail({
        token: agreementToken,
        partnerId,
        email: session?.email,
      });
      if (res.ok) {
        toast.success(res.message || "Merchant agreement link sent to your registered email.");
      } else {
        toast.error("Could not resend email. Please try again.");
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to resend agreement email.");
    } finally {
      setResendingAgreement(false);
    }
  };

  useEffect(() => {
    let mounted = true;
    const isCurrentlyApproved = isPartnerApproved(session);
    if (isCurrentlyApproved) {
      navigate({ to: partnerRoutes.dashboard, replace: true });
      return;
    }
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

  const isAgrApproved = agreementStatus === "APPROVED" || agreementApproved || isApproved;

  const timeline = [
    {
      icon: Check,
      label: "Application Received",
      body: "Store details, services rate card & bank proof submitted",
      status: "done" as const,
    },
    {
      icon: isAgrApproved ? FileCheck2 : Mail,
      label: "Master Merchant Agreement",
      body: isAgrApproved
        ? "Bilateral Master Merchant SLA digitally executed"
        : "Action Required: Review & digitally sign agreement sent to your email",
      status: isAgrApproved ? ("done" as const) : ("active" as const),
    },
    {
      icon: isApproved ? ShieldCheck : Clock3,
      label: "Admin & Document Verification",
      body: isApproved
        ? "Documents verified & approved by QuickPress Admin"
        : isAgrApproved
        ? "Admin team is reviewing business credentials & store details"
        : "Awaiting partner agreement digital signature before approval",
      status: isApproved ? ("done" as const) : (isAgrApproved ? ("active" as const) : ("locked" as const)),
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
            <span className="animate-success-pop relative flex size-24 items-center justify-center rounded-full bg-primary/15 text-primary shadow-soft ring-8 ring-primary/10">
              <span className="absolute inset-0 animate-ping rounded-full bg-primary/15" />
              <BadgeCheck className="size-12" strokeWidth={2.6} />
            </span>

            <span className="mt-5 inline-flex items-center gap-1.5 rounded-full bg-primary/15 px-4 py-1.5 text-[0.72rem] font-black uppercase tracking-widest text-primary">
              <Sparkles className="size-3.5" />
              Approved & Activated
            </span>

            <h1 className="mt-3 text-2xl font-black leading-tight tracking-tight text-foreground">
              Application Approved!
            </h1>
            <p className="mt-2 text-sm font-medium text-muted-foreground">
              <span className="font-bold text-foreground">{businessName}</span> is verified and ready to accept laundry & dry cleaning orders.
            </p>

            {partnerId ? (
              <p className="mt-2 text-[0.7rem] font-semibold text-muted-foreground">
                Partner ID · <span className="font-mono text-foreground">{formatPartnerId(partnerId)}</span>
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
                <span className="font-mono font-bold text-foreground">{formatPartnerId(partnerId)}</span>
              </div>
            ) : null}
          </section>
        )}

        {/* REJECTION / UPDATE REQUIRED CARD */}
        {!isApproved && (rejectionReason || kycStatus === "rejected") && (
          <section className="animate-slide-up card-soft mt-5 border border-rose-500/40 bg-rose-500/10 p-4.5 rounded-2xl shadow-soft">
            <div className="flex items-start gap-3">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-rose-500/20 text-rose-600 font-black">
                <AlertTriangle className="size-5" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-xs font-black uppercase tracking-wider text-rose-700">
                    Document Correction Required
                  </p>
                  <span className="rounded bg-rose-500/20 px-1.5 py-0.5 text-[0.62rem] font-black text-rose-800">
                    REJECTED / ACTION NEEDED
                  </span>
                </div>
                <div className="mt-2 rounded-xl border border-rose-200 bg-white/90 p-3 shadow-xs">
                  <p className="text-[0.68rem] font-bold uppercase text-rose-500 tracking-wider">
                    Admin Rejection Reason:
                  </p>
                  <p className="mt-0.5 text-xs font-semibold leading-relaxed text-foreground">
                    {rejectionReason || "One or more documents or business details were rejected during admin verification. Please correct and re-submit."}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => navigate({ to: partnerRoutes.registration, search: { resubmit: true } })}
                  className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-rose-600 py-3 text-xs font-black text-white shadow-cta transition-all hover:bg-rose-700 active:scale-95"
                >
                  <Edit3 className="size-3.5" />
                  Update &amp; Re-Submit Store Documents
                </button>
              </div>
            </div>
          </section>
        )}

        {/* RE-SUBMITTED STATUS BANNER */}
        {!isApproved && isResubmitted && !(rejectionReason || kycStatus === "rejected") && (
          <section className="animate-slide-up card-soft mt-5 border border-indigo-500/30 bg-indigo-500/10 p-3.5 rounded-2xl">
            <div className="flex items-center gap-2.5">
              <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-indigo-500/20 text-indigo-700 font-bold">
                <RefreshCw className="size-4 animate-spin" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-indigo-900">
                  Documents Re-Submitted Successfully!
                </p>
                <p className="text-[0.68rem] text-indigo-700">
                  Your corrected partner documents have been queued for priority admin review.
                </p>
              </div>
            </div>
          </section>
        )}

        {/* ACTION REQUIRED: SIGN MASTER MERCHANT AGREEMENT BANNER */}
        {!isApproved && !isAgrApproved && (
          <section className="animate-slide-up card-soft mt-5 border-2 border-amber-500/50 bg-amber-500/10 p-4.5 rounded-2xl shadow-soft">
            <div className="flex items-start gap-3">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-amber-500/20 text-amber-800 font-black">
                <FileText className="size-5" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-xs font-black uppercase tracking-wider text-amber-900">
                    Action Required: Sign Merchant Agreement
                  </p>
                  <span className="rounded bg-amber-500/30 px-1.5 py-0.5 text-[0.62rem] font-black text-amber-950">
                    SLA PENDING
                  </span>
                </div>
                <p className="mt-1.5 text-xs font-semibold leading-relaxed text-amber-950">
                  Your Master Merchant Agreement has been dispatched to <strong>{session?.email || "your registered email"}</strong>. Please review commercial terms and digitally sign the agreement to unlock Admin approval.
                </p>

                <div className="mt-3.5 flex flex-col sm:flex-row gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      navigate({
                        to: partnerRoutes.agreementSign,
                        search: { token: agreementToken },
                      })
                    }
                    className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 py-3 text-xs font-black text-white shadow-cta transition-all active:scale-95 cursor-pointer"
                  >
                    <FileCheck2 className="size-4" />
                    Review &amp; Sign Agreement Now
                  </button>

                  <button
                    type="button"
                    disabled={resendingAgreement}
                    onClick={handleResendAgreement}
                    className="flex items-center justify-center gap-1.5 rounded-xl border border-amber-300 bg-white hover:bg-neutral-50 px-3 py-2.5 text-xs font-bold text-neutral-800 transition active:scale-95 cursor-pointer disabled:opacity-50"
                  >
                    {resendingAgreement ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : (
                      <Mail className="size-3.5 text-amber-700" />
                    )}
                    <span>Resend Email</span>
                  </button>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* AGREEMENT EXECUTED CONFIRMATION BADGE */}
        {!isApproved && isAgrApproved && (
          <section className="animate-slide-up card-soft mt-5 border border-emerald-500/40 bg-emerald-500/10 p-3.5 rounded-2xl">
            <div className="flex items-center gap-2.5">
              <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-800 font-bold">
                <CheckCircle2 className="size-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-emerald-950">
                  Merchant SLA Agreement Digitally Executed ✓
                </p>
                <p className="text-[0.68rem] text-emerald-800">
                  Your signed agreement is archived. The Operations Desk is completing final store verification.
                </p>
              </div>
            </div>
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
              className="flex w-full items-center justify-center gap-2.5 rounded-2xl bg-primary py-4 text-sm font-black tracking-tight text-white shadow-cta"
            >
              <Loader2 className="size-4 animate-spin" />
              Approved! Redirecting to Dashboard...
            </button>
          ) : isApproved ? (
            <button
              type="button"
              onClick={() => navigate({ to: partnerRoutes.dashboard })}
              className="ripple focus-key flex w-full items-center justify-center gap-2 rounded-2xl bg-primary hover:bg-primary-dark py-4 text-sm font-black tracking-tight text-white shadow-cta transition-all duration-300 active:scale-[0.97] cursor-pointer"
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

          {!isApproved && (
            <button
              type="button"
              onClick={() => navigate({ to: partnerRoutes.registration, search: { resubmit: true } })}
              className="ripple focus-key flex w-full items-center justify-center gap-2 rounded-2xl border border-border bg-card py-3.5 text-xs font-bold text-foreground shadow-soft transition-all duration-300 hover:bg-muted active:scale-[0.97]"
            >
              <Edit3 className="size-3.5 text-primary" />
              Update / Re-Submit Store Documents
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
