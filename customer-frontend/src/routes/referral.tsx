import { createFileRoute } from "@tanstack/react-router";
import {
  BadgeCheck,
  CheckCircle2,
  CloudOff,
  Clock,
  Copy,
  Gift,
  Link2,
  Loader2,
  MessageCircle,
  MessageSquare,
  QrCode,
  RefreshCw,
  Share2,
  Ticket,
  Users,
  Wallet,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { BottomNav } from "@/components/home/BottomNav";
import { EmptyState } from "@/components/common/EmptyState";
import { ReferralSkeleton } from "@/components/rewards/RewardsSkeletons";
import { NotificationBellAction, ScreenTopBar } from "@/components/rewards/ScreenTopBar";
import { Toaster } from "@/shared/ui/sonner";
import { isApiError } from "@/api/core/errors";
import { isOnline, onNetworkChange } from "@/api/customer/api/network";
import {
  applyReferralCode,
  canNativeShare,
  copyToClipboard,
  fetchReferralDashboard,
  nativeShareReferral,
  recordReferralInvite,
  smsShareUrl,
  whatsappShareUrl,
  type ReferralDashboard,
} from "@/api/customer/referral-api";
import { useAuthGuard } from "@/hooks/useAuthGuard";

export const Route = createFileRoute("/referral")({
  head: () => ({
    meta: [
      { title: "Refer & Earn — QuickPress Referral Rewards" },
      {
        name: "description",
        content:
          "Share your QuickPress referral code, invite friends over WhatsApp or SMS and earn wallet rewards once they complete their first laundry order.",
      },
      { property: "og:title", content: "Refer & Earn — QuickPress Referral Rewards" },
      {
        property: "og:description",
        content:
          "Invite friends to QuickPress with your personal referral code and QR, track successful referrals and collect wallet rewards.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ReferralScreen,
});

type TabId = "invite" | "history" | "rewards";

const TABS: { id: TabId; label: string }[] = [
  { id: "invite", label: "Invite" },
  { id: "history", label: "Friends" },
  { id: "rewards", label: "Rewards" },
];

function StatCard({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Users;
  label: string;
  value: string;
}) {
  return (
    <div className="card-soft flex flex-col items-start gap-2 border border-border px-4 py-4">
      <span className="flex size-9 items-center justify-center rounded-2xl bg-primary/12 text-brand-dark">
        <Icon className="size-4" />
      </span>
      <p className="text-lg font-black leading-none tracking-tight text-foreground">{value}</p>
      <p className="text-[0.68rem] font-semibold uppercase tracking-widest text-muted-foreground">
        {label}
      </p>
    </div>
  );
}

function ReferralScreen() {
  useAuthGuard();
  const [data, setData] = useState<ReferralDashboard | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [offline, setOffline] = useState(false);
  const [tab, setTab] = useState<TabId>("invite");
  const [code, setCode] = useState("");
  const [applying, setApplying] = useState(false);
  const [applyError, setApplyError] = useState<string | null>(null);

  const load = useCallback(async (options: { refresh?: boolean } = {}) => {
    if (options.refresh) setRefreshing(true);
    else setData((prev) => prev ?? null);
    setError(null);
    try {
      const result = await fetchReferralDashboard(
        options.refresh ? { forceRefresh: true } : {},
      );
      setData(result);
    } catch (caught) {
      setError(isApiError(caught) ? caught.userMessage : "We couldn't load your referrals.");
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  /* Offline banner + automatic sync when the connection returns. */
  useEffect(() => {
    setOffline(!isOnline());
    return onNetworkChange((online) => {
      setOffline(!online);
      if (online) void load({ refresh: true });
    });
  }, [load]);

  const share = async (channel: "copy" | "link" | "whatsapp" | "sms" | "share") => {
    if (!data) return;
    void recordReferralInvite(channel);
    if (channel === "copy") {
      const ok = await copyToClipboard(data.code);
      if (ok) toast.success("Referral code copied");
      else toast.error("Couldn't copy the code");
      return;
    }
    if (channel === "link") {
      const ok = await copyToClipboard(data.link);
      if (ok) toast.success("Referral link copied");
      else toast.error("Couldn't copy the link");
      return;
    }
    if (channel === "whatsapp") {
      window.open(whatsappShareUrl(data.shareMessage), "_blank", "noopener,noreferrer");
      return;
    }
    if (channel === "sms") {
      window.location.href = smsShareUrl(data.shareMessage);
      return;
    }
    const shared = await nativeShareReferral(data.shareMessage, data.link);
    if (!shared) {
      const ok = await copyToClipboard(data.shareMessage);
      if (ok) toast.success("Invite copied — paste it anywhere");
    }
  };

  const handleApply = async () => {
    setApplyError(null);
    setApplying(true);
    try {
      const result = await applyReferralCode(code);
      toast.success(result.message);
      setCode("");
      await load({ refresh: true });
    } catch (caught) {
      const message = isApiError(caught)
        ? caught.userMessage
        : "We couldn't apply that code. Please try again.";
      setApplyError(message);
      toast.error(message);
    } finally {
      setApplying(false);
    }
  };

  const pendingRewards = data?.rewards.filter((item) => item.status === "pending") ?? [];
  const completedRewards = data?.rewards.filter((item) => item.status === "completed") ?? [];

  return (
    <main className="relative min-h-screen overflow-x-hidden bg-white dark:bg-zinc-950">
      <div className="relative mx-auto w-full max-w-md">
        <ScreenTopBar title="Refer & Earn" action={<NotificationBellAction />} />

        {offline ? (
          <div className="mx-5 mt-3 flex items-center gap-2 rounded-2xl bg-muted px-4 py-2.5 text-xs font-semibold text-muted-foreground">
            <CloudOff className="size-4" />
            You're offline — showing your saved referral data.
          </div>
        ) : null}

        {!data && !error ? <ReferralSkeleton /> : null}

        {!data && error ? (
          <div className="px-5 pb-32 pt-6">
            <EmptyState
              icon={CloudOff}
              title="Referrals didn't load"
              description={error}
              actionLabel="Try again"
              onAction={() => void load({ refresh: true })}
            />
          </div>
        ) : null}

        {data ? (
          <div className="px-5 pb-32 pt-4">
            {/* Referral code card — GET /api/referral */}
            <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-600 via-emerald-700 to-emerald-950 p-5 shadow-soft text-white">
              <div className="pointer-events-none absolute -right-10 -top-12 size-40 rounded-full bg-emerald-400/25 blur-2xl" />
              <div className="pointer-events-none absolute -bottom-10 -left-10 size-40 rounded-full bg-emerald-500/20 blur-2xl" />
              <div className="relative flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[0.68rem] font-bold uppercase tracking-widest text-emerald-100">
                    Your referral code
                  </p>
                  <p className="mt-1 truncate text-2xl font-black tracking-[0.18em] text-white">
                    {data.code}
                  </p>
                  <p className="mt-2 text-xs leading-relaxed text-emerald-100/90 font-medium">
                    Friends get 50% OFF (up to ₹{data.stats.refereeReward}) — you get ₹
                    {data.stats.referrerReward} wallet cash after their 1st completed order.
                  </p>
                </div>
                <button
                  type="button"
                  aria-label="Refresh referrals"
                  onClick={() => void load({ refresh: true })}
                  className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-white/15 text-white backdrop-blur-sm transition-all duration-300 hover:bg-white/25 active:scale-[0.94]"
                >
                  {refreshing ? (
                    <Loader2 className="size-4 animate-spin text-white" />
                  ) : (
                    <RefreshCw className="size-4" />
                  )}
                </button>
              </div>

              <div className="relative mt-4 flex items-center gap-3 rounded-2xl bg-black/25 backdrop-blur-md border border-white/15 p-3">
                <div className="size-20 shrink-0 rounded-xl bg-white p-1.5 flex items-center justify-center shadow-xs">
                  <img
                    src={data.qrCodeUrl}
                    alt={`QR code for QuickPress referral code ${data.code}`}
                    loading="lazy"
                    className="size-full object-contain"
                  />
                </div>
                <div className="min-w-0">
                  <p className="flex items-center gap-1.5 text-[0.68rem] font-bold uppercase tracking-widest text-emerald-100">
                    <QrCode className="size-3.5" /> Scan to join
                  </p>
                  <p className="mt-1 truncate text-xs text-white/95 font-medium">{data.link}</p>
                  <button
                    type="button"
                    onClick={() => void share("copy")}
                    className="ripple mt-2 inline-flex h-9 items-center gap-1.5 rounded-2xl bg-white px-4 text-xs font-black text-emerald-800 shadow-sm transition-all duration-300 hover:bg-emerald-50 active:scale-[0.96]"
                  >
                    <Copy className="size-3.5" /> Copy code
                  </button>
                </div>
              </div>
            </section>

            {/* Stats — GET /api/referral/stats */}
            <section className="mt-5 grid grid-cols-2 gap-3">
              <StatCard icon={Users} label="Total invites" value={String(data.stats.totalInvites)} />
              <StatCard
                icon={BadgeCheck}
                label="Successful"
                value={String(data.stats.successfulReferrals)}
              />
              <StatCard
                icon={Gift}
                label="Rewards earned"
                value={`₹${data.stats.totalRewardsEarned.toLocaleString("en-IN")}`}
              />
              <StatCard
                icon={Wallet}
                label="Wallet rewards"
                value={`₹${data.stats.walletRewards.toLocaleString("en-IN")}`}
              />
            </section>

            {/* Tabs */}
            <div className="mt-6 flex gap-2 rounded-2xl bg-muted p-1">
              {TABS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setTab(item.id)}
                  className={`h-9 flex-1 rounded-xl text-xs font-bold transition-all duration-300 ${
                    tab === item.id
                      ? "bg-background text-foreground shadow-soft"
                      : "text-muted-foreground"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>

            {tab === "invite" ? (
              <>
                {/* Invite friends — POST /api/referral/invite */}
                <section className="mt-5">
                  <h2 className="text-sm font-bold tracking-tight text-foreground">
                    Invite friends
                  </h2>
                  <div className="mt-3 grid grid-cols-2 gap-3">
                    {[
                      { id: "whatsapp" as const, label: "WhatsApp", icon: MessageCircle },
                      { id: "sms" as const, label: "SMS", icon: MessageSquare },
                      { id: "link" as const, label: "Copy link", icon: Link2 },
                      {
                        id: "share" as const,
                        label: canNativeShare() ? "More apps" : "Copy invite",
                        icon: Share2,
                      },
                    ].map((action) => (
                      <button
                        key={action.id}
                        type="button"
                        onClick={() => void share(action.id)}
                        className="card-soft ripple flex items-center gap-3 border border-border px-4 py-3.5 text-left transition-all duration-300 active:scale-[0.97]"
                      >
                        <span className="flex size-9 items-center justify-center rounded-2xl bg-secondary/10 text-brand-green">
                          <action.icon className="size-4" />
                        </span>
                        <span className="text-xs font-bold text-foreground">{action.label}</span>
                      </button>
                    ))}
                  </div>
                </section>

                {/* Apply a referral code — POST /api/referral/apply */}
                <section className="mt-6">
                  <h2 className="text-sm font-bold tracking-tight text-foreground">
                    Have a referral code?
                  </h2>
                  {data.appliedCode ? (
                    <div className="card-soft mt-3 flex items-center gap-3 border border-border px-4 py-4">
                      <span className="flex size-9 items-center justify-center rounded-2xl bg-secondary/10 text-brand-green">
                        <CheckCircle2 className="size-4" />
                      </span>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-foreground">
                          Code {data.appliedCode} applied
                        </p>
                        <p className="mt-0.5 text-[0.7rem] text-muted-foreground">
                          Your ₹{data.stats.refereeReward} reward is credited after your first
                          completed order.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="card-soft mt-3 border border-border px-4 py-4">
                      <label
                        htmlFor="referral-code"
                        className="text-[0.68rem] font-semibold uppercase tracking-widest text-muted-foreground"
                      >
                        Referral code
                      </label>
                      <div className="mt-2 flex gap-2">
                        <input
                          id="referral-code"
                          value={code}
                          maxLength={24}
                          autoCapitalize="characters"
                          placeholder="QPFRIEND100"
                          onChange={(event) => {
                            setCode(event.target.value.toUpperCase());
                            setApplyError(null);
                          }}
                          className="h-11 min-w-0 flex-1 rounded-2xl bg-muted px-4 text-sm font-bold tracking-[0.12em] text-foreground outline-none placeholder:font-medium placeholder:tracking-normal placeholder:text-muted-foreground focus:ring-2 focus:ring-ring"
                        />
                        <button
                          type="button"
                          disabled={applying || code.trim().length < 3}
                          onClick={() => void handleApply()}
                          className="ripple flex h-11 items-center gap-1.5 rounded-2xl bg-primary px-4 text-xs font-bold text-primary-foreground shadow-cta transition-all duration-300 active:scale-[0.96] disabled:opacity-50"
                        >
                          {applying ? (
                            <Loader2 className="size-4 animate-spin" />
                          ) : (
                            <Ticket className="size-4" />
                          )}
                          Apply
                        </button>
                      </div>
                      {applyError ? (
                        <p className="mt-2 text-[0.7rem] font-semibold text-destructive">
                          {applyError}
                        </p>
                      ) : (
                        <p className="mt-2 text-[0.7rem] text-muted-foreground">
                          One referral code per account. You can't use your own code.
                        </p>
                      )}
                    </div>
                  )}
                </section>
              </>
            ) : null}

            {/* Referral history — GET /api/referral/history */}
            {tab === "history" ? (
              <section className="mt-5">
                <h2 className="text-sm font-bold tracking-tight text-foreground">
                  Friends you referred
                </h2>
                {data.history.length === 0 ? (
                  <div className="mt-3">
                    <EmptyState
                      icon={Users}
                      title="No referrals yet"
                      description="Share your code with a friend — you'll see them here as soon as they join."
                      actionLabel="Invite a friend"
                      onAction={() => setTab("invite")}
                    />
                  </div>
                ) : (
                  <div className="mt-3 space-y-3">
                    {data.history.map((friend) => (
                      <article
                        key={friend.id}
                        className="card-soft flex items-center gap-3 border border-border px-4 py-3.5"
                      >
                        <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-primary/12 text-xs font-black text-brand-dark">
                          {friend.friendName.slice(0, 2).toUpperCase()}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-xs font-bold text-foreground">
                            {friend.friendName}
                          </p>
                          <p className="mt-0.5 text-[0.7rem] text-muted-foreground">
                            Joined {friend.joinedLabel}
                          </p>
                        </div>
                        <div className="shrink-0 text-right">
                          <span
                            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[0.62rem] font-bold uppercase tracking-wider ${
                              friend.status === "completed"
                                ? "bg-secondary/10 text-brand-green"
                                : "bg-primary/15 text-brand-dark"
                            }`}
                          >
                            {friend.status === "completed" ? "Completed" : "Pending"}
                          </span>
                          <p className="mt-1 text-xs font-black text-foreground">
                            ₹{friend.rewardEarned}
                          </p>
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </section>
            ) : null}

            {/* Referral rewards — GET /api/referral/rewards */}
            {tab === "rewards" ? (
              <section className="mt-5">
                <div className="grid grid-cols-2 gap-3">
                  <StatCard
                    icon={Clock}
                    label="Pending"
                    value={`₹${data.stats.pendingRewards.toLocaleString("en-IN")}`}
                  />
                  <StatCard
                    icon={CheckCircle2}
                    label="Completed"
                    value={`₹${data.stats.totalRewardsEarned.toLocaleString("en-IN")}`}
                  />
                </div>

                <h2 className="mt-6 text-sm font-bold tracking-tight text-foreground">
                  Reward history
                </h2>
                {data.rewards.length === 0 ? (
                  <div className="mt-3">
                    <EmptyState
                      icon={Gift}
                      title="No rewards yet"
                      description="Rewards appear here once a friend joins with your code and completes their first order."
                      actionLabel="Share your code"
                      onAction={() => setTab("invite")}
                    />
                  </div>
                ) : (
                  <div className="mt-3 space-y-3">
                    {[...pendingRewards, ...completedRewards].map((reward) => (
                      <article
                        key={reward.id}
                        className="card-soft flex items-center gap-3 border border-border px-4 py-3.5"
                      >
                        <span
                          className={`flex size-10 shrink-0 items-center justify-center rounded-2xl ${
                            reward.status === "completed"
                              ? "bg-secondary/10 text-brand-green"
                              : "bg-primary/15 text-brand-dark"
                          }`}
                        >
                          {reward.status === "completed" ? (
                            <Gift className="size-4" />
                          ) : (
                            <Clock className="size-4" />
                          )}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-xs font-bold text-foreground">
                            {reward.title}
                          </p>
                          <p className="mt-0.5 truncate text-[0.7rem] text-muted-foreground">
                            {reward.description || reward.friendName || "Referral reward"} ·{" "}
                            {reward.dateLabel}
                          </p>
                        </div>
                        <div className="shrink-0 text-right">
                          <p className="text-xs font-black text-foreground">+₹{reward.amount}</p>
                          <p
                            className={`mt-0.5 text-[0.62rem] font-bold uppercase tracking-wider ${
                              reward.status === "completed"
                                ? "text-brand-green"
                                : "text-muted-foreground"
                            }`}
                          >
                            {reward.status === "completed" ? "Credited" : "Pending"}
                          </p>
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </section>
            ) : null}

            {data.fromCache ? (
              <p className="mt-6 text-center text-[0.7rem] text-muted-foreground">
                Showing saved referral data
                {offline ? "" : " — pull refresh for the latest"}
              </p>
            ) : null}
          </div>
        ) : null}

        <BottomNav />
        <Toaster />
      </div>
    </main>
  );
}
