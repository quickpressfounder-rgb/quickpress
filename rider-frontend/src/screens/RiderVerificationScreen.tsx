import { useNavigate } from "@tanstack/react-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  AlertCircle,
  Award,
  Building2,
  CheckCircle2,
  ChevronRight,
  Clock,
  FileCheck2,
  FileText,
  HelpCircle,
  IdCard,
  LogOut,
  MapPin,
  MessageCircle,
  Phone,
  RefreshCw,
  RotateCcw,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Truck,
  User,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import {
  fetchRiderVerificationStatus,
  type RiderVerificationStatusResponse,
} from "../api/rider/rider-verification-api";
import { clearSession, readSession, writeSession } from "../api/core/session-store";
import { triggerHaptic } from "../lib/captain-audio";
import { subscribeRiderStatus } from "../lib/rider-socket";

export function RiderVerificationScreen() {
  const navigate = useNavigate();
  const [data, setData] = useState<RiderVerificationStatusResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadStatus = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const res = await fetchRiderVerificationStatus();
      setData(res);

      // If not registered at all, redirect to registration
      if (!res.isOnboarded) {
        const current = readSession("rider") || readSession();
        if (current && (current.isOnboarded || (current.account as any)?.isOnboarded)) {
          writeSession({
            ...current,
            isOnboarded: false,
            is_onboarded: false,
            account: {
              ...(current.account || {}),
              isOnboarded: false,
              is_onboarded: false,
            },
          }, "rider");
        }
        toast.info("Please submit your Captain registration first.");
        navigate({ to: "/registration", replace: true });
        return;
      }

      // If approved, update local session store and navigate to dashboard
      if (res.isApproved || res.isVerified) {
        const current = readSession("rider") || readSession();
        if (current) {
          writeSession({
            ...current,
            isVerified: true,
            is_verified: true,
            isApproved: true,
            status: "active",
            kycStatus: "verified",
            account: {
              ...(current.account || {}),
              is_verified: true,
              isVerified: true,
              status: "active",
              kycStatus: "verified",
            },
          }, "rider");
        }
        triggerHaptic();
        toast.success("🎉 Congratulations! Your Captain account has been approved by Admin!");
        setTimeout(() => {
          navigate({ to: "/dashboard", replace: true });
        }, 1000);
        return;
      }

      if (isRefresh) {
        triggerHaptic();
        if (res.kycStatus === "rejected") {
          toast.error("Application rejected. Please see rejection reason below.");
        } else {
          toast.info("Status checked: Under admin verification ⏳");
        }
      }
    } catch {
      toast.error("Unable to check verification status. Please retry.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [navigate]);

  useEffect(() => {
    loadStatus();
    // Fast auto-poll status every 4 seconds for instant real-time unlock when Admin approves
    const interval = setInterval(() => {
      loadStatus(false);
    }, 4000);
    return () => clearInterval(interval);
  }, [loadStatus]);

  // Real-time Socket.IO subscription for instant Admin Approval event
  useEffect(() => {
    const unsub = subscribeRiderStatus((statusData) => {
      console.log("[RiderVerificationScreen] ⚡ Realtime rider status:", statusData);
      loadStatus(true);
    });

    return () => {
      unsub();
    };
  }, [loadStatus]);

  const handleLogout = () => {
    triggerHaptic();
    clearSession("rider");
    clearSession();
    toast.info("Logged out successfully");
    navigate({ to: "/auth" });
  };

  const isApproved = data?.isApproved ?? false;
  const isRejected = (data?.kycStatus === "rejected" || data?.status === "rejected") && !isApproved;
  const rejectionReason = data?.rejectionReason;

  return (
    <div className="relative flex flex-col w-full min-h-[100dvh] max-w-md mx-auto bg-white shadow-xl overflow-hidden text-slate-800 select-none font-sans">
      {/* 1. Top Header */}
      <header
        className="sticky top-0 z-30 flex items-center justify-between px-4 pb-3 bg-white border-b border-slate-100 shadow-2xs"
        style={{ paddingTop: "max(env(safe-area-inset-top, 0px) + 8px, 12px)" }}
      >
        <div className="flex items-center gap-2.5">
          <img
            src="/quickpress-brand-logo-transparent.png"
            alt="QuickPress"
            className="h-6 w-auto object-contain"
          />
          <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 border border-amber-200 uppercase tracking-wider">
            Verification
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => loadStatus(true)}
            disabled={loading || refreshing}
            className="p-2 text-slate-600 hover:text-slate-950 hover:bg-slate-100 rounded-full active:scale-95 transition-all"
            title="Refresh Status"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin text-emerald-600" : ""}`} />
          </button>
          <button
            type="button"
            onClick={handleLogout}
            className="flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-slate-600 hover:text-red-600 hover:bg-red-50 rounded-xl border border-slate-200 transition-all active:scale-95"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Logout</span>
          </button>
        </div>
      </header>

      {/* 2. Main Scrollable Content */}
      <main
        className="flex-1 overflow-y-auto px-4 py-4 space-y-4"
        style={{ paddingBottom: "max(env(safe-area-inset-bottom, 0px) + 20px, 32px)" }}
      >
        {/* HERO STATUS CARD */}
        {isApproved ? (
          // Case 1: APPROVED
          <section className="p-5 rounded-3xl bg-gradient-to-br from-emerald-50 via-white to-emerald-100/60 border border-emerald-200 shadow-sm text-center space-y-3">
            <div className="w-16 h-16 rounded-3xl bg-emerald-500 text-white flex items-center justify-center mx-auto shadow-md shadow-emerald-500/30">
              <CheckCircle2 className="w-9 h-9" />
            </div>
            <div>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                <span>Verification Approved ✅</span>
              </span>
              <h2 className="text-xl font-black text-slate-900 mt-2">
                Welcome to QuickPress Captain!
              </h2>
              <p className="text-xs text-slate-600 mt-1 font-medium">
                Your KYC documents and vehicle registration have been verified by the Admin. You are now ready to start earning!
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                triggerHaptic();
                navigate({ to: "/dashboard" });
              }}
              className="w-full flex items-center justify-center gap-2 py-3.5 px-4 rounded-2xl bg-emerald-500 hover:bg-emerald-600 active:scale-98 text-white font-black text-sm shadow-md shadow-emerald-500/25 transition-all"
            >
              <span>Enter Captain Dashboard 🚀</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </section>
        ) : isRejected ? (
          // Case 2: REJECTED
          <section className="p-5 rounded-3xl bg-gradient-to-br from-red-50 via-white to-red-100/50 border border-red-200 shadow-sm space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center shrink-0">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-red-700 bg-red-100/80 px-2 py-0.5 rounded-md">
                  Action Required
                </span>
                <h2 className="text-base font-black text-slate-900 mt-0.5">
                  KYC Verification Rejected
                </h2>
              </div>
            </div>

            <div className="p-3 bg-red-50 rounded-2xl border border-red-200/80 text-xs text-red-900">
              <p className="font-bold text-red-950 flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 text-red-600 shrink-0" />
                <span>Reason from Admin Desk:</span>
              </p>
              <p className="mt-1 text-red-800 font-medium leading-relaxed">
                {rejectionReason || "One or more documents uploaded are invalid or unclear. Please re-upload with clear photos."}
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                triggerHaptic();
                navigate({ to: "/registration", search: { resubmit: true } });
              }}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-2xl bg-slate-900 hover:bg-slate-800 active:scale-98 text-white font-black text-xs shadow-sm transition-all cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Update & Re-Submit Documents</span>
            </button>
          </section>
        ) : (
          // Case 3: UNDER VERIFICATION (PENDING)
          <section className="p-5 rounded-3xl bg-gradient-to-br from-amber-50/80 via-white to-amber-100/50 border border-amber-200 shadow-sm space-y-3 text-center">
            <div className="relative w-16 h-16 rounded-3xl bg-amber-400/90 text-slate-950 flex items-center justify-center mx-auto shadow-md shadow-amber-400/20">
              <Clock className="w-8 h-8 animate-pulse text-slate-950" />
              <span className="absolute -top-1 -right-1 flex h-4 w-4">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-4 w-4 bg-amber-500" />
              </span>
            </div>

            <div>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-200">
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                <span>Under Admin Verification ⏳</span>
              </span>
              <h2 className="text-lg font-black text-slate-900 mt-2">
                Application Under Review
              </h2>
              {data?.resubmitted && (
                <div className="my-2 p-2 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-900 font-bold text-xs flex items-center justify-center gap-1.5">
                  <RotateCcw className="w-3.5 h-3.5 text-indigo-700 animate-spin" />
                  <span>Updated Documents Re-Submitted Successfully!</span>
                </div>
              )}
              <p className="text-xs text-slate-600 mt-1 font-medium leading-relaxed">
                Your Captain profile, driving license, and vehicle documents are currently being verified by the <strong>QuickPress Kasganj Admin Desk</strong>.
              </p>
            </div>

            {/* Estimated Turnaround Time */}
            <div className="p-3 bg-white/90 rounded-2xl border border-amber-200 shadow-2xs flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 text-slate-700">
                <Clock className="w-4 h-4 text-amber-600" />
                <span className="font-medium">Estimated Review Time:</span>
              </div>
              <span className="font-bold text-slate-900">
                {data?.estimatedTime || "24 – 48 Hours"}
              </span>
            </div>

            {/* Manual Check Status Button */}
            <button
              type="button"
              onClick={() => loadStatus(true)}
              disabled={refreshing}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-2xl bg-amber-400 hover:bg-amber-500 active:scale-98 text-slate-950 font-black text-xs shadow-xs transition-all cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
              <span>{refreshing ? "Checking Admin Status..." : "Check Status Now 🔄"}</span>
            </button>

            {/* Update / Re-Fill Button for Pending Application */}
            <button
              type="button"
              onClick={() => {
                triggerHaptic();
                navigate({ to: "/registration", search: { resubmit: true } });
              }}
              className="w-full flex items-center justify-center gap-1.5 py-2.5 px-4 rounded-2xl bg-white hover:bg-slate-50 active:scale-98 text-slate-800 font-bold text-xs border border-amber-200 shadow-2xs transition-all cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5 text-amber-700" />
              <span>Update & Edit Submitted Details</span>
            </button>
          </section>
        )}

        {/* 4-STEP VERIFICATION TRACKER */}
        <section className="p-4 bg-white rounded-3xl border border-slate-200 shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-500">
              Verification Progress
            </h3>
            <span className="text-[10px] font-bold text-slate-500">
              Step 3 of 4 Active
            </span>
          </div>

          <div className="space-y-3 relative pl-6 border-l-2 border-slate-100 ml-3">
            {(data?.steps || [
              {
                id: "step_1",
                title: "Mobile OTP & Security Authentication",
                status: "completed",
                desc: `Phone ${data?.phone || "+91 80775 49253"} authenticated via OTP`,
              },
              {
                id: "step_2",
                title: "KYC Documents & Vehicle Registration",
                status: "completed",
                desc: "Aadhaar, Driving License, RC & Bank details uploaded",
              },
              {
                id: "step_3",
                title: "Admin Document Review & Background Check",
                status: isApproved ? "completed" : isRejected ? "rejected" : "in_progress",
                desc: isApproved
                  ? "Approved by Kasganj Admin Desk"
                  : isRejected
                  ? "Rejected by Admin Desk"
                  : "Kasganj Verification Desk is reviewing your documents",
              },
              {
                id: "step_4",
                title: "Captain Account Activation & Dispatch Ready",
                status: isApproved ? "completed" : "pending",
                desc: isApproved
                  ? "Live order dispatch and daily earnings unlocked"
                  : "Locked until Admin approves your application",
              },
            ]).map((step, idx) => {
              const isDone = step.status === "completed";
              const isInProgress = step.status === "in_progress";
              const isStepRejected = step.status === "rejected";

              return (
                <div key={step.id || idx} className="relative">
                  {/* Step Pin Dot */}
                  <div
                    className={`absolute -left-[31px] top-0 w-6 h-6 rounded-full flex items-center justify-center border-2 ${
                      isDone
                        ? "bg-emerald-500 border-white text-white shadow-xs"
                        : isInProgress
                        ? "bg-amber-400 border-white text-slate-950 ring-2 ring-amber-300 animate-pulse"
                        : isStepRejected
                        ? "bg-red-500 border-white text-white"
                        : "bg-slate-100 border-slate-200 text-slate-400"
                    }`}
                  >
                    {isDone ? (
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    ) : isStepRejected ? (
                      <AlertCircle className="w-3.5 h-3.5" />
                    ) : isInProgress ? (
                      <Clock className="w-3 h-3" />
                    ) : (
                      <span className="text-[10px] font-bold">{idx + 1}</span>
                    )}
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-xs font-bold text-slate-900 leading-tight">
                        {step.title}
                      </h4>
                      {isDone && (
                        <span className="text-[9px] font-black text-emerald-700 bg-emerald-100 px-1.5 py-0.2 rounded">
                          Done
                        </span>
                      )}
                      {isInProgress && (
                        <span className="text-[9px] font-black text-amber-800 bg-amber-100 px-1.5 py-0.2 rounded">
                          In Review
                        </span>
                      )}
                      {isStepRejected && (
                        <span className="text-[9px] font-black text-red-700 bg-red-100 px-1.5 py-0.2 rounded">
                          Action Needed
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5 font-medium leading-relaxed">
                      {step.desc}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* SUBMITTED DOCUMENTS CHECKLIST */}
        {/* SUBMITTED DOCUMENTS CHECKLIST */}
        <section className="p-4 bg-white rounded-3xl border border-slate-200 shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-500">
              Submitted Documents
            </h3>
            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                isApproved
                  ? "text-emerald-700 bg-emerald-50 border-emerald-200"
                  : isRejected
                  ? "text-red-700 bg-red-50 border-red-200"
                  : "text-amber-800 bg-amber-50 border-amber-200"
              }`}
            >
              {isApproved
                ? "All 5 Verified ✅"
                : isRejected
                ? "Action Required ⚠️"
                : "Documents In Review ⏳"}
            </span>
          </div>

          <div className="space-y-2">
            {(data?.documents && data.documents.length > 0
              ? data.documents
              : [
                  { id: "aadhaar", name: "Aadhaar Card (Front & Back)", status: isApproved ? "verified" : isRejected ? "rejected" : "submitted" },
                  { id: "dl", name: "Driving License (DL)", status: isApproved ? "verified" : isRejected ? "rejected" : "submitted" },
                  { id: "rc", name: "Vehicle RC Certificate", status: isApproved ? "verified" : isRejected ? "rejected" : "submitted" },
                  { id: "selfie", name: "Live Profile Selfie Photo", status: isApproved ? "verified" : isRejected ? "rejected" : "submitted" },
                  { id: "bank", name: "Bank Account & UPI Details", status: isApproved ? "verified" : isRejected ? "rejected" : "submitted" },
                ]
            ).map((doc) => {
              const iconMap: Record<string, any> = {
                aadhaar: IdCard,
                dl: Award,
                rc: Truck,
                selfie: User,
                bank: Building2,
                agreement: FileCheck2,
              };
              const Icon = iconMap[doc.id] || FileText;
              const docIsRejected = doc.status === "rejected";
              const docIsVerified = isApproved || doc.status === "verified";
              const specificDocReason = (doc as any).rejectionReason || (docIsRejected ? rejectionReason : null);

              return (
                <div
                  key={doc.id}
                  className={`p-3 rounded-2xl border transition-all ${
                    docIsRejected
                      ? "bg-red-50/70 border-red-200 shadow-2xs"
                      : docIsVerified
                      ? "bg-emerald-50/40 border-emerald-100"
                      : "bg-slate-50/80 border-slate-100"
                  }`}
                >
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2.5">
                      <div
                        className={`w-8 h-8 rounded-xl border flex items-center justify-center shrink-0 ${
                          docIsRejected
                            ? "bg-red-100 border-red-200 text-red-600"
                            : docIsVerified
                            ? "bg-emerald-100 border-emerald-200 text-emerald-700"
                            : "bg-white border-slate-200 text-slate-700"
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="font-bold text-slate-800">{doc.name}</span>
                        {docIsRejected && (
                          <span className="block text-[10px] text-red-600 font-bold">
                            ⚠️ Verification Failed
                          </span>
                        )}
                      </div>
                    </div>

                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1 ${
                        docIsVerified
                          ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                          : docIsRejected
                          ? "bg-red-100 text-red-800 border border-red-200"
                          : "bg-amber-100 text-amber-900 border border-amber-200"
                      }`}
                    >
                      {docIsVerified ? (
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                      ) : docIsRejected ? (
                        <AlertCircle className="w-3 h-3 text-red-600" />
                      ) : (
                        <Clock className="w-3 h-3 text-amber-600" />
                      )}
                      <span>
                        {docIsVerified ? "Verified" : docIsRejected ? "Rejected" : "In Review"}
                      </span>
                    </span>
                  </div>

                  {docIsRejected && specificDocReason && (
                    <div className="mt-2 pt-2 border-t border-red-200/60 flex items-start gap-1.5 text-[11px] text-red-800">
                      <AlertCircle className="w-3.5 h-3.5 text-red-600 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold text-red-950">Rejection Note: </span>
                        <span>{specificDocReason}</span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {isRejected && (
            <div className="pt-2">
              <button
                type="button"
                onClick={() => {
                  triggerHaptic();
                  navigate({ to: "/registration" });
                }}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-2xl bg-red-600 hover:bg-red-700 active:scale-98 text-white font-black text-xs shadow-sm transition-all"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Fix & Re-upload Rejected Documents</span>
              </button>
            </div>
          )}
        </section>

        {/* APPLICATION SUMMARY */}
        <section className="p-4 bg-slate-50/90 rounded-3xl border border-slate-200/80 space-y-2 text-xs">
          <h4 className="text-xs font-black uppercase tracking-wider text-slate-500 mb-1">
            Application Summary
          </h4>
          <div className="flex justify-between text-slate-600">
            <span>Captain Name</span>
            <span className="font-bold text-slate-900">{data?.name || "—"}</span>
          </div>
          <div className="flex justify-between text-slate-600">
            <span>Captain ID</span>
            <span className="font-mono font-bold text-slate-900">{data?.riderId || "—"}</span>
          </div>
          <div className="flex justify-between text-slate-600">
            <span>Registered Mobile</span>
            <span className="font-mono font-bold text-slate-900">{data?.phone || "—"}</span>
          </div>
          <div className="flex justify-between text-slate-600">
            <span>City & Operating Zone</span>
            <span className="font-bold text-slate-900">{data?.city || "Kasganj Main Hub"}</span>
          </div>
          <div className="flex justify-between text-slate-600">
            <span>Vehicle Type & Number</span>
            <span className="font-bold text-slate-900">
              {data?.vehicleType || "Bike"}{data?.vehicleNumber ? ` (${data.vehicleNumber})` : ""}
            </span>
          </div>
        </section>

        {/* 24/7 SUPPORT HELPDESK */}
        <section className="p-4 bg-white rounded-3xl border border-slate-200 shadow-2xs space-y-2.5">
          <div className="flex items-center gap-2 text-slate-900">
            <HelpCircle className="w-4 h-4 text-emerald-600" />
            <h4 className="text-xs font-black uppercase tracking-wide">
              Need Verification Help?
            </h4>
          </div>
          <p className="text-[11px] text-slate-600 font-medium">
            If your application is taking longer than 48 hours, you can reach out to our regional verification team directly:
          </p>

          <div className="grid grid-cols-2 gap-2 pt-1">
            <a
              href="tel:18001237729"
              className="flex items-center justify-center gap-1.5 py-2 px-3 bg-slate-50 hover:bg-slate-100 rounded-xl border border-slate-200 text-slate-900 text-xs font-bold transition-all active:scale-95"
            >
              <Phone className="w-3.5 h-3.5 text-emerald-600" />
              <span>1800-123-QPAY</span>
            </a>
            <a
              href="https://wa.me/918006000000"
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-center gap-1.5 py-2 px-3 bg-emerald-50 hover:bg-emerald-100 rounded-xl border border-emerald-200 text-emerald-800 text-xs font-bold transition-all active:scale-95"
            >
              <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
              <span>WhatsApp Desk</span>
            </a>
          </div>
        </section>
      </main>
    </div>
  );
}
