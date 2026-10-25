import React, { useEffect, useState } from "react";
import { Check, Copy, Gift, Share2, Sparkles, X } from "lucide-react";
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 select-none animate-in fade-in duration-200">
      <div onClick={onClose} className="absolute inset-0 bg-black/60 backdrop-blur-xs" />

      <div
        onClick={(e) => e.stopPropagation()}
        className="relative flex flex-col w-full max-w-sm max-h-[88vh] bg-white rounded-3xl border border-zinc-200 p-5 shadow-2xl text-left overflow-y-auto space-y-4 animate-in zoom-in-95 duration-200"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
          <div>
            <div className="flex items-center gap-1.5">
              <span className="inline-flex items-center rounded-md bg-zinc-900 px-2 py-0.5 text-[10px] font-bold text-white uppercase">
                Captain Referral
              </span>
              <span className="text-[10px] font-semibold text-zinc-500">
                {hub?.activeRule?.city || "All Cities"}
              </span>
            </div>
            <h3 className="mt-1 text-base font-black text-zinc-950">
              Refer a Captain &amp; Earn ₹{rewardAmount}
            </h3>
            <p className="text-[11px] font-medium text-zinc-500">
              Reward credited directly into your Rider Wallet Float.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full bg-zinc-100 p-1.5 text-zinc-500 hover:bg-zinc-200"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Claimable Balance Banner */}
        {hub && hub.claimableBalance > 0 && (
          <div className="rounded-2xl bg-zinc-950 p-4 text-white shadow-md space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Claimable Reward</p>
                <p className="text-2xl font-black text-white">₹{hub.claimableBalance.toLocaleString("en-IN")}</p>
              </div>
              <span className="rounded-full bg-white/10 px-2.5 py-1 text-xs font-semibold text-white">
                {hub.unlockedMilestoneCount} Unlocked
              </span>
            </div>
            <p className="text-[11px] text-zinc-300">
              Target trip milestone achieved! Transfer this reward to your Captain Wallet Float.
            </p>
            <button
              type="button"
              disabled={claiming}
              onClick={() => handleClaim()}
              className="w-full rounded-xl bg-white py-2.5 text-xs font-black text-zinc-950 hover:bg-zinc-100 active:scale-95 transition-all cursor-pointer shadow-xs"
            >
              {claiming ? "Transferring..." : "Claim to Captain Wallet"}
            </button>
          </div>
        )}

        {/* Referral Code Box */}
        <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-zinc-700">Your Referral Code</span>
            <span className="text-[10px] text-zinc-400">Share with other riders</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex-1 rounded-xl bg-white px-3.5 py-2.5 font-mono text-sm font-black text-zinc-900 border border-zinc-200 text-center tracking-wider">
              {hub?.code || "QP-RDR-..."}
            </div>
            <button
              type="button"
              onClick={copyCode}
              className="flex items-center gap-1 rounded-xl border border-zinc-300 bg-white px-3 py-2.5 text-xs font-bold text-zinc-800 hover:bg-zinc-100 active:scale-95 transition"
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
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-zinc-900 py-2.5 text-xs font-bold text-white hover:bg-zinc-800 active:scale-95 transition"
          >
            <Share2 className="size-4" />
            <span>Share via WhatsApp</span>
          </a>
        </div>

        {/* Milestone Progression List */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-zinc-900">
              Referred Captains ({hub?.ledger?.length ?? 0})
            </h4>
            <span className="text-[10px] text-zinc-400">
              Earned: ₹{(hub?.totalClaimedBalance ?? 0).toLocaleString("en-IN")}
            </span>
          </div>

          {loading ? (
            <div className="py-5 text-center text-xs text-zinc-400">Loading captain referrals...</div>
          ) : !hub?.ledger?.length ? (
            <div className="rounded-2xl border border-dashed border-zinc-200 p-4 text-center">
              <p className="text-xs font-semibold text-zinc-700">No referred captains yet</p>
              <p className="text-[11px] text-zinc-400 mt-0.5">
                Share your code with any delivery rider. When they complete {targetOrders} delivery trips, you get ₹{rewardAmount}!
              </p>
            </div>
          ) : (
            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {hub.ledger.map((item) => {
                const pct = Math.min(100, Math.round((item.completedOrders / (item.targetOrders || 1)) * 100));

                return (
                  <div key={item.id} className="rounded-xl border border-zinc-200 bg-white p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs font-bold text-zinc-900">{item.refereeName}</p>
                        <p className="text-[10px] text-zinc-400">{item.city || "All Cities"}</p>
                      </div>
                      <span className="text-xs font-black text-zinc-900">₹{item.rewardAmount}</span>
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-[10px] font-medium text-zinc-600">
                        <span>{item.completedOrders} of {item.targetOrders} trips completed</span>
                        <span>{pct}%</span>
                      </div>
                      <div className="w-full bg-zinc-100 h-1.5 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${pct === 100 ? "bg-zinc-900" : "bg-zinc-400"}`}
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
                          className="rounded-lg bg-zinc-900 px-2.5 py-1 text-[10px] font-bold text-white hover:bg-zinc-800"
                        >
                          Claim ₹{item.rewardAmount}
                        </button>
                      ) : item.status === "claimed_to_cycle" ? (
                        <span className="text-[10px] font-bold text-zinc-700 bg-zinc-100 px-2 py-0.5 rounded">
                          Credited to Wallet
                        </span>
                      ) : item.status === "settled" ? (
                        <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded">
                          Settled
                        </span>
                      ) : (
                        <span className="text-[10px] font-medium text-zinc-400">
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

        {/* How it Works Guide */}
        <div className="rounded-2xl border border-zinc-100 bg-zinc-50/70 p-3 space-y-2">
          <p className="text-[11px] font-bold text-zinc-800 uppercase tracking-wider">How Captain Referral Works</p>
          <div className="space-y-1.5 text-[11px] text-zinc-600">
            <div className="flex items-start gap-2">
              <span className="flex size-4 shrink-0 items-center justify-center rounded-full bg-zinc-200 text-[10px] font-bold text-zinc-800">
                1
              </span>
              <span>Share your referral code with any delivery rider.</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="flex size-4 shrink-0 items-center justify-center rounded-full bg-zinc-200 text-[10px] font-bold text-zinc-800">
                2
              </span>
              <span>They sign up and get their Captain Profile verified.</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="flex size-4 shrink-0 items-center justify-center rounded-full bg-zinc-200 text-[10px] font-bold text-zinc-800">
                3
              </span>
              <span>
                When they complete {targetOrders} delivery trips, ₹{rewardAmount} is credited to your Rider Wallet Float!
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
