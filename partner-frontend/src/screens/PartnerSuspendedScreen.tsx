import { useNavigate } from "@tanstack/react-router";
import {
  AlertTriangle,
  Clock3,
  Copy,
  Headphones,
  HelpCircle,
  Loader2,
  LogOut,
  Mail,
  MessageCircle,
  Phone,
  RefreshCw,
  Send,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Store,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { Toaster } from "@/shared/ui/sonner";
import { apiGetJson, apiPostJson } from "@/api/core/transport";
import { usePartnerContext } from "../context/PartnerContext";
import { partnerRoutes } from "../navigation/partner-routes";

export function PartnerSuspendedScreen() {
  const navigate = useNavigate();
  const { session, signIn, signOut } = usePartnerContext();

  const [loading, setLoading] = useState(true);
  const [profileData, setProfileData] = useState<{
    status?: string;
    businessName?: string;
    suspensionReason?: string;
    suspendedAt?: string;
    appealStatus?: string;
    appealDetails?: string;
    appealSubmittedAt?: string;
  } | null>(null);

  const [appealText, setAppealText] = useState("");
  const [submittingAppeal, setSubmittingAppeal] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const partnerId = useMemo(() => {
    return session?.partnerId || session?.businessName || "QP-STORE-0000";
  }, [session]);

  const fetchSuspensionDetails = async (silent = false) => {
    if (!silent) setRefreshing(true);
    try {
      const res = await apiGetJson<{
        status?: string;
        businessName?: string;
        suspensionReason?: string;
        suspendedAt?: string;
        appealStatus?: string;
        appealDetails?: string;
        appealSubmittedAt?: string;
      }>("/api/partner/profile");

      setProfileData(res);

      // If status is active or no longer suspended, unlock and route to dashboard
      if (res.status === "active" || res.status === "approved") {
        if (session) {
          signIn({
            ...session,
            isVerified: true,
            status: "active",
          });
        }
        toast.success("🎉 Your Partner Store is now ACTIVE! Redirecting to Dashboard...");
        setTimeout(() => navigate({ to: partnerRoutes.dashboard }), 600);
      }
    } catch {
      // Fallback
    } finally {
      setLoading(false);
      if (!silent) setRefreshing(false);
    }
  };

  useEffect(() => {
    void fetchSuspensionDetails(true);
    // Poll status every 6 seconds to see if admin approved/unsuspended
    const interval = setInterval(() => {
      void fetchSuspensionDetails(true);
    }, 6000);
    return () => clearInterval(interval);
  }, []);

  const handleAppealSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!appealText.trim()) {
      toast.error("Please provide an explanation for your store appeal.");
      return;
    }
    setSubmittingAppeal(true);
    try {
      await apiPostJson("/api/partner/appeal", { reason: appealText });
      toast.success("Store appeal submitted successfully! Trust & Safety team has been notified.");
      setAppealText("");
      await fetchSuspensionDetails(true);
    } catch (err: any) {
      toast.error(err.message || "Failed to submit appeal. Please try again.");
    } finally {
      setSubmittingAppeal(false);
    }
  };

  const handleCopyId = () => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(partnerId);
      toast.success("Partner ID copied to clipboard!");
    }
  };

  const handleWhatsApp = () => {
    const text = encodeURIComponent(
      `Hello QuickPress Trust & Safety Team, my Partner Store ID is: ${partnerId}. My store is suspended and I would like assistance regarding my appeal.`
    );
    window.open(`https://wa.me/919876543210?text=${text}`, "_blank");
  };

  const handleLogout = () => {
    signOut();
    navigate({ to: partnerRoutes.auth });
  };

  const isAppealPending = profileData?.appealStatus === "pending";

  return (
    <main className="relative min-h-screen overflow-x-hidden bg-slate-900 text-slate-100 select-none">
      <Toaster position="top-center" richColors />

      {/* Red ambient warning background glow */}
      <div className="pointer-events-none absolute -top-40 left-1/2 size-[32rem] -translate-x-1/2 rounded-full bg-rose-600/15 blur-3xl" />

      <div className="relative mx-auto flex min-h-screen w-full max-w-md flex-col justify-between px-5 pb-10 pt-10 lg:max-w-2xl">
        <div>
          {/* Top Warning Shield */}
          <div className="animate-slide-up text-center">
            <span className="relative mx-auto flex size-24 items-center justify-center rounded-3xl bg-rose-500/20 text-rose-500 shadow-xl border border-rose-500/30 ring-8 ring-rose-500/10">
              <span className="absolute inset-0 animate-ping rounded-3xl bg-rose-500/10" />
              <ShieldAlert className="size-12 stroke-[2.2]" />
            </span>

            <span className="mt-5 inline-flex items-center gap-1.5 rounded-full bg-rose-500/20 px-3.5 py-1 text-[11px] font-black uppercase tracking-wider text-rose-400 border border-rose-500/30">
              <AlertTriangle className="size-3.5" />
              Partner Store Suspended
            </span>

            <h1 className="mt-3 text-2xl font-black tracking-tight text-white sm:text-3xl">
              Store Operations Suspended
            </h1>
            <p className="mt-2 text-xs font-medium leading-relaxed text-slate-400 max-w-sm mx-auto">
              Your store ordering, public catalog visibility, and payout disbursements have been temporarily halted by Operations Trust &amp; Safety.
            </p>
          </div>

          {/* Store Info & Suspension Reason Card */}
          <div className="mt-6 overflow-hidden rounded-3xl border border-slate-800 bg-slate-950/80 p-5 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                  Store Name &amp; Partner ID
                </p>
                <p className="mt-0.5 font-mono text-base font-black text-white tracking-wide">
                  {profileData?.businessName || session?.businessName || partnerId}
                </p>
              </div>
              <button
                type="button"
                onClick={handleCopyId}
                className="flex items-center gap-1 rounded-xl border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-bold text-slate-300 hover:text-white hover:bg-slate-700 active:scale-95 transition-all"
              >
                <Copy className="size-3.5" />
                <span>Copy</span>
              </button>
            </div>

            <div className="mt-4 space-y-2">
              <p className="text-[10px] font-black uppercase tracking-wider text-rose-400">
                Reason for Suspension
              </p>
              <div className="rounded-2xl border border-rose-900/50 bg-rose-950/30 p-3.5 text-xs font-semibold text-rose-200 leading-snug">
                {profileData?.suspensionReason ||
                  "Store under review due to SLA guidelines breach or compliance standards check."}
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between border-t border-slate-800/80 pt-3 text-[11px] text-slate-400 font-medium">
              <span>Current Status</span>
              <span className="font-bold text-rose-400 uppercase tracking-wider">
                Store Inactive &amp; Locked
              </span>
            </div>
          </div>

          {/* Appeal Section */}
          <div className="mt-5 rounded-3xl border border-slate-800 bg-slate-950/80 p-5 shadow-xl">
            {isAppealPending ? (
              <div className="text-center py-2">
                <span className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
                  <Clock3 className="size-6 animate-pulse" />
                </span>
                <h3 className="mt-3 text-base font-black text-white">
                  Store Appeal Under Review ⏳
                </h3>
                <p className="mt-1.5 text-xs font-medium text-slate-400 leading-relaxed max-w-md mx-auto">
                  Your store appeal has been recorded and submitted to the Trust &amp; Safety committee. We review appeals within 24 hours. Your store will remain inactive until reviewed and approved.
                </p>

                {profileData?.appealDetails && (
                  <div className="mt-3.5 rounded-2xl border border-slate-800 bg-slate-900/80 p-3 text-left">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      Your Submitted Explanation:
                    </p>
                    <p className="mt-1 text-xs text-slate-200 italic font-normal">
                      &quot;{profileData.appealDetails}&quot;
                    </p>
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => void fetchSuspensionDetails(false)}
                  disabled={refreshing}
                  className="mt-4 inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-xs font-black text-white shadow-sm hover:bg-slate-700 active:scale-95 transition-all"
                >
                  <RefreshCw className={`size-3.5 ${refreshing ? "animate-spin" : ""}`} />
                  <span>{refreshing ? "Checking..." : "Refresh Status"}</span>
                </button>
              </div>
            ) : (
              <form onSubmit={handleAppealSubmit}>
                <div className="flex items-center gap-2">
                  <span className="flex size-7 items-center justify-center rounded-xl bg-amber-500/20 text-amber-400">
                    <Sparkles className="size-4" />
                  </span>
                  <h3 className="text-sm font-black text-white">
                    Submit Appeal to Operations Team
                  </h3>
                </div>
                <p className="mt-1 text-xs text-slate-400">
                  If you believe this suspension is in error or you have resolved the SLA / store issue, submit an explanation below for reconsideration.
                </p>

                <textarea
                  rows={3}
                  value={appealText}
                  onChange={(e) => setAppealText(e.target.value)}
                  placeholder="Explain your situation clearly (e.g. why SLA delay occurred or corrective actions taken)..."
                  className="mt-3 w-full rounded-2xl border border-slate-700 bg-slate-900 p-3.5 text-xs text-white placeholder:text-slate-500 focus:border-amber-400 focus:outline-hidden"
                />

                <button
                  type="submit"
                  disabled={submittingAppeal || !appealText.trim()}
                  className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl bg-amber-400 py-3 text-xs font-black text-slate-950 shadow-lg shadow-amber-400/20 hover:bg-amber-300 active:scale-[0.98] disabled:opacity-50 transition-all"
                >
                  {submittingAppeal ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Send className="size-4" />
                  )}
                  <span>Submit Store Appeal for Review</span>
                </button>
              </form>
            )}
          </div>
        </div>

        {/* 24/7 Help & Support Actions */}
        <div className="mt-8 space-y-3">
          <p className="text-center text-[10px] font-black uppercase tracking-widest text-slate-500">
            Need Immediate Help?
          </p>

          <div className="space-y-2.5">
            <button
              type="button"
              onClick={() => navigate({ to: partnerRoutes.registration, search: { resubmit: true } })}
              className="flex w-full items-center justify-center gap-2 rounded-2xl border border-amber-400/40 bg-amber-400/10 px-4 py-3.5 text-xs font-black text-amber-300 hover:bg-amber-400/20 active:scale-[0.98] transition-all shadow-md"
            >
              <Store className="size-4" />
              <span>Update Store Details &amp; Re-Submit Documents / पुनः सुधारें</span>
            </button>

            <div className="grid grid-cols-2 gap-2.5">
            {/* WhatsApp */}
            <button
              type="button"
              onClick={handleWhatsApp}
              className="flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-3 py-3 text-xs font-black text-white shadow-md hover:bg-emerald-700 active:scale-[0.98] transition-all"
            >
              <MessageCircle className="size-4" />
              <span>WhatsApp Support</span>
            </button>

            {/* Helpline */}
            <a
              href="tel:+918005550199"
              className="flex items-center justify-center gap-2 rounded-2xl border border-slate-700 bg-slate-800 px-3 py-3 text-xs font-black text-slate-200 hover:bg-slate-700 active:scale-[0.98] transition-all"
            >
              <Phone className="size-4" />
              <span>Call Helpline</span>
            </a>
            </div>
          </div>

          {/* Logout Action */}
          <div className="pt-2 text-center">
            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-rose-400 transition-colors"
            >
              <LogOut className="size-3.5" />
              <span>Log Out &amp; Switch Account</span>
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
