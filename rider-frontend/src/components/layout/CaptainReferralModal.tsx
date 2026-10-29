import React, { useEffect, useState } from "react";
import { Check, Copy, Gift, Share2, X, ChevronRight, IndianRupee } from "lucide-react";
import { toast } from "sonner";
import {
  fetchRiderReferralHub,
  claimRiderReferralReward,
  type RiderReferralHubResponse,
} from "../../api/rider/rider-referral-api";
import { triggerHaptic } from "../../lib/captain-audio";

interface CaptainReferralModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CaptainReferralModal: React.FC<CaptainReferralModalProps> = ({ isOpen, onClose }) => {
  const [hub, setHub] = useState<RiderReferralHubResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  // Safe Native Android Back Button Interception
  useEffect(() => {
    if (!isOpen) return;

    let cleanup: (() => void) | null = null;
    if (typeof window !== "undefined" && (window as any).Capacitor?.isNativePlatform?.()) {
      import("@capacitor/app")
        .then(({ App }) => {
          App.addListener("backButton", () => {
            triggerHaptic(20);
            onClose();
          })
            .then((h) => {
              cleanup = () => h.remove();
            })
            .catch(() => {});
        })
        .catch(() => {});
    }

    return () => {
      if (cleanup) cleanup();
    };
  }, [isOpen, onClose]);

  const loadHub = async () => {
    try {
      setLoading(true);
      const res = await fetchRiderReferralHub();
      setHub(res);
    } catch (err) {
      console.error("Failed to load rider referral hub:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      void loadHub();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleClaim = async (rewardId?: string) => {
    try {
      triggerHaptic(30);
      setClaiming(true);
      const res = await claimRiderReferralReward(rewardId);
      toast.success(res.message || "Referral reward credited to Rider Wallet!");
      await loadHub();
    } catch (err: any) {
      toast.error(err?.message || "Failed to claim referral reward");
    } finally {
      setClaiming(false);
    }
  };

  const copyCode = () => {
    if (!hub?.code) return;
    triggerHaptic(15);
    navigator.clipboard.writeText(hub.code);
    setCopiedCode(true);
    toast.success("Referral code copied!");
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const rewardAmount = hub?.activeRule?.referrerReward ?? 300;
  const targetOrders = hub?.activeRule?.targetOrdersCount ?? 20;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 select-none animate-in fade-in duration-200">
      <div onClick={onClose} className="absolute inset-0 bg-black/60 backdrop-blur-xs" />

      <div
        onClick={(e) => e.stopPropagation()}
        className="relative flex flex-col w-full max-w-md max-h-[88vh] bg-white rounded-t-3xl sm:rounded-3xl border border-slate-200/80 shadow-2xl text-left overflow-hidden animate-in slide-in-from-bottom duration-300 font-sans"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-[#F8F9FA] shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center size-9 rounded-xl bg-slate-100 text-slate-900 font-black">
              <Gift className="size-5 stroke-[2.2]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black text-slate-950">Refer a Captain</h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-200 text-slate-700">
                  {hub?.activeRule?.city || "All Cities"}
                </span>
              </div>
              <p className="text-[11px] font-medium text-slate-500">
                Earn ₹{rewardAmount} per onboarded captain
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              triggerHaptic(20);
              onClose();
            }}
            className="flex items-center justify-center size-8.5 rounded-full bg-slate-100 text-slate-700 hover:bg-slate-200 active:scale-90 transition cursor-pointer"
            aria-label="Close"
          >
            <X className="size-4.5 stroke-[2.2]" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Claimable Balance Card (Clean White with Emerald Accent) */}
          {hub && hub.claimableBalance > 0 && (
            <div className="rounded-2xl bg-white border border-slate-200/90 p-4 shadow-2xs space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    Claimable Reward
                  </p>
                  <p className="text-2xl font-black text-slate-950">
                    ₹{hub.claimableBalance.toLocaleString("en-IN")}
                  </p>
                </div>
                <span className="rounded-full bg-emerald-50 border border-emerald-200/80 px-2.5 py-1 text-xs font-bold text-emerald-700">
                  {hub.unlockedMilestoneCount} Unlocked
                </span>
              </div>
              <p className="text-xs text-slate-600 font-medium">
                Target delivery trip milestone achieved! Transfer this reward directly to your Captain Wallet Float.
              </p>
              <button
                type="button"
                disabled={claiming}
                onClick={() => handleClaim()}
                className="w-full rounded-full bg-slate-950 py-3 text-xs font-bold text-white hover:bg-slate-800 active:scale-95 transition-all cursor-pointer shadow-xs"
              >
                {claiming ? "Transferring..." : "Claim to Captain Wallet"}
              </button>
            </div>
          )}

          {/* Referral Code Box (Clean White / Off-white) */}
          <div className="rounded-2xl border border-slate-200/80 bg-[#F8F9FA] p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800">Your Referral Code</span>
              <span className="text-[11px] text-slate-500 font-medium">Share with delivery riders</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex-1 rounded-xl bg-white px-3.5 py-2.5 font-mono text-sm font-black text-slate-950 border border-slate-200/80 text-center tracking-wider shadow-2xs">
                {hub?.code || "QP-RDR-..."}
              </div>
              <button
                type="button"
                onClick={copyCode}
                className="flex items-center gap-1.5 rounded-full border border-slate-300 bg-white px-4 py-2.5 text-xs font-bold text-slate-800 hover:bg-slate-50 active:scale-95 transition shadow-2xs cursor-pointer"
              >
                {copiedCode ? <Check className="size-4 text-emerald-600" /> : <Copy className="size-4" />}
                <span>{copiedCode ? "Copied" : "Copy"}</span>
              </button>
            </div>

            <a
              href={`https://api.whatsapp.com/send?text=${encodeURIComponent(
                hub?.shareMessage ||
                  `Join QuickPress as a Delivery Captain with my referral code ${hub?.code} and start earning daily: https://quickpress.online/rider-register?ref=${hub?.code}`
              )}`}
              target="_blank"
              rel="noreferrer"
              onClick={() => triggerHaptic(15)}
              className="flex w-full items-center justify-center gap-2 rounded-full bg-slate-950 py-3 text-xs font-bold text-white hover:bg-slate-800 active:scale-95 transition cursor-pointer shadow-xs"
            >
              <Share2 className="size-4" />
              <span>Share via WhatsApp</span>
            </a>
          </div>

          {/* Milestone Progression List */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-black text-slate-950">
                Referred Captains ({hub?.ledger?.length ?? 0})
              </h4>
              <span className="text-[11px] font-bold text-slate-600 font-mono">
                Total Earned: ₹{(hub?.totalClaimedBalance ?? 0).toLocaleString("en-IN")}
              </span>
            </div>

            {loading ? (
              <div className="py-6 text-center text-xs text-slate-400">Loading captain referrals...</div>
            ) : !hub?.ledger?.length ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-5 text-center">
                <p className="text-xs font-bold text-slate-800">No referred captains yet</p>
                <p className="text-[11px] text-slate-500 font-medium mt-1 leading-relaxed">
                  Share your code with any delivery rider. Jab wo {targetOrders} delivery trips complete karenge, aapko ₹{rewardAmount} cash reward milega!
                </p>
              </div>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {hub.ledger.map((item) => {
                  const pct = Math.min(100, Math.round((item.completedOrders / (item.targetOrders || 1)) * 100));

                  return (
                    <div key={item.id} className="rounded-2xl border border-slate-200/80 bg-white p-3.5 shadow-2xs space-y-2">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs font-black text-slate-950">{item.refereeName}</p>
                          <p className="text-[10px] text-slate-400 font-medium">{item.city || "All Cities"}</p>
                        </div>
                        <span className="text-xs font-black text-slate-950 font-mono">₹{item.rewardAmount}</span>
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-[10px] font-semibold text-slate-600">
                          <span>{item.completedOrders} of {item.targetOrders} trips completed</span>
                          <span>{pct}%</span>
                        </div>
                        <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                          <div
                            className={`h-full transition-all duration-300 ${pct === 100 ? "bg-emerald-500" : "bg-slate-950"}`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-1">
                        {item.status === "unlocked" ? (
                          <button
                            type="button"
                            disabled={claiming}
                            onClick={() => handleClaim(item.id)}
                            className="rounded-full bg-slate-950 px-3 py-1 text-[11px] font-bold text-white hover:bg-slate-800 active:scale-95 transition cursor-pointer"
                          >
                            Claim ₹{item.rewardAmount}
                          </button>
                        ) : item.status === "claimed_to_cycle" ? (
                          <span className="text-[10px] font-bold text-slate-700 bg-slate-100 px-2.5 py-0.5 rounded-full">
                            Credited to Wallet
                          </span>
                        ) : item.status === "settled" ? (
                          <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200/80 px-2.5 py-0.5 rounded-full">
                            Settled
                          </span>
                        ) : (
                          <span className="text-[10px] font-medium text-slate-400">
                            In Progress ({item.completedOrders}/{item.targetOrders})
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* How it Works Guide (Clean White Card) */}
          <div className="rounded-2xl border border-slate-200/80 bg-white p-4 space-y-2.5 shadow-2xs">
            <p className="text-xs font-black text-slate-950">How Captain Referral Works</p>
            <div className="space-y-2 text-xs text-slate-600">
              <div className="flex items-start gap-2.5">
                <span className="flex size-4.5 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[10px] font-black text-slate-900 mt-0.5">
                  1
                </span>
                <span>Share your referral code with any delivery rider friend.</span>
              </div>
              <div className="flex items-start gap-2.5">
                <span className="flex size-4.5 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[10px] font-black text-slate-900 mt-0.5">
                  2
                </span>
                <span>They register and complete document verification in Captain App.</span>
              </div>
              <div className="flex items-start gap-2.5">
                <span className="flex size-4.5 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[10px] font-black text-slate-900 mt-0.5">
                  3
                </span>
                <span>
                  When they complete {targetOrders} delivery orders, ₹{rewardAmount} is directly credited to your Rider Wallet Float.
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div
          className="p-4 border-t border-slate-100 bg-white shrink-0"
          style={{ paddingBottom: "max(calc(env(safe-area-inset-bottom, 0px) + 16px), 24px)" }}
        >
          <button
            type="button"
            onClick={() => {
              triggerHaptic(20);
              onClose();
            }}
            className="w-full py-3.5 bg-slate-950 hover:bg-slate-800 text-white rounded-full font-black text-sm active:scale-98 transition cursor-pointer shadow-xs"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
