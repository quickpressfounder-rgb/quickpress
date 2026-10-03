import { useNavigate } from "@tanstack/react-router";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Banknote,
  Clock3,
  Download,
  FileText,
  Landmark,
  Loader2,
  Wallet as WalletIcon,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Toaster } from "@/shared/ui/sonner";

import { PartnerLayout } from "../components/layout/PartnerLayout";
import { PartnerCardsSkeleton } from "../components/PartnerSkeletons";
import { SectionHeading, StatCard } from "../components/PartnerPrimitives";
import { usePartnerResource } from "../hooks/use-partner-resource";
import { partnerRoutes } from "../navigation/partner-routes";
import {
  fetchPartnerWallet,
  fetchPartnerWalletTransactions,
  withdrawToBank,
} from "@/api/partner/partner-wallet-api";

export function WalletScreen() {
  const navigate = useNavigate();
  const walletState = usePartnerResource(fetchPartnerWallet);
  const txnState = usePartnerResource(fetchPartnerWalletTransactions);
  const wallet = walletState.data;
  const transactions = txnState.data;
  const [busy, setBusy] = useState(false);

  const handleWithdraw = async () => {
    if (!wallet) return;
    setBusy(true);
    try {
      const result = await withdrawToBank(wallet.availableBalance);
      walletState.setData({ ...wallet, availableBalance: result.wallet.balance });
      toast.success("Withdrawal requested — credited within 24 hours");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Withdrawal failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <PartnerLayout
      activeTab="earnings"
      title="Store Wallet"
      subtitle="Manage live wallet balance, settlement transactions and withdrawal ledger"
    >
      <div className="mx-auto w-full max-w-7xl px-4 py-4 md:px-8 md:py-6">
        {!wallet || !transactions ? (
          <PartnerCardsSkeleton />
        ) : (
          <div className="animate-soft-fade space-y-6 pb-12">
            {/* Top Wallet Balance Banner */}
            <div className="grid gap-6 lg:grid-cols-3">
              <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-dark via-zinc-900 to-brand-green p-6 text-white shadow-soft lg:col-span-1">
                <div className="pointer-events-none absolute -right-10 -top-12 size-40 rounded-full bg-primary/25 blur-2xl" />
                <div className="relative flex items-center gap-2 text-white/70">
                  <WalletIcon className="size-4" />
                  <p className="text-xs font-bold uppercase tracking-widest">
                    Available Balance
                  </p>
                </div>
                <p className="relative mt-2 text-3xl font-black tracking-tight text-white md:text-4xl">
                  ₹{wallet.availableBalance.toLocaleString("en-IN")}
                </p>
                <p className="relative mt-1 text-xs font-semibold text-white/70">
                  ₹{wallet.onHold.toLocaleString("en-IN")} on hold · Bank ••{wallet.bankLast4}
                </p>

                <button
                  type="button"
                  disabled={busy || wallet.availableBalance === 0}
                  onClick={() => void handleWithdraw()}
                  className="relative mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-3.5 text-xs font-black text-brand-dark shadow-cta transition-all hover:brightness-105 active:scale-95 disabled:opacity-60"
                >
                  {busy ? <Loader2 className="size-4 animate-spin" /> : <Banknote className="size-4" />}
                  Withdraw to Bank
                </button>
              </section>

              <div className="grid grid-cols-2 gap-4 lg:col-span-2">
                <StatCard
                  icon={Landmark}
                  label="Lifetime Earned"
                  value={`₹${(wallet.lifetimeEarned / 1000).toFixed(1)}k`}
                  delay={0}
                />
                <StatCard
                  icon={Clock3}
                  label="Auto Payout"
                  value={wallet.autoPayout ? "On" : "Off"}
                  hint="Daily T+1"
                  tone="green"
                  delay={45}
                />
              </div>
            </div>

            {/* Quick Action: Monthly Settlement & GST Invoices */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 rounded-3xl border border-zinc-200/80 bg-white p-5 shadow-xs">
              <div className="flex items-center gap-3">
                <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-zinc-900 text-white shadow-xs">
                  <FileText className="size-5 text-emerald-400" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-zinc-900">Monthly Settlement Statement & GST Invoices</h3>
                  <p className="text-xs text-zinc-500">
                    Download bank reconciliation statements (PDF/Excel) & monthly GST commission tax invoices.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => navigate({ to: partnerRoutes.earnings })}
                className="flex items-center justify-center gap-2 rounded-2xl bg-zinc-950 px-5 py-3 text-xs font-black text-white hover:bg-zinc-800 active:scale-95 transition-all shadow-xs"
              >
                <Download className="size-4" />
                <span>Download Statements</span>
              </button>
            </div>

            {/* Transactions Ledger */}
            <section className="rounded-3xl border border-border/80 bg-card p-6 shadow-sm">
              <SectionHeading title="Transaction History" />
              <div className="mt-4 divide-y divide-border/60">
                {transactions.map((txn) => {
                  const isCredit = txn.type === "credit";
                  return (
                    <div
                      key={txn.id}
                      className="flex items-center justify-between py-4 first:pt-0 last:pb-0"
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className={`flex size-9 shrink-0 items-center justify-center rounded-2xl ${
                            isCredit
                              ? "bg-emerald-500/15 text-emerald-600"
                              : "bg-muted text-foreground"
                          }`}
                        >
                          {isCredit ? (
                            <ArrowDownLeft className="size-4" />
                          ) : (
                            <ArrowUpRight className="size-4" />
                          )}
                        </span>
                        <div>
                          <p className="text-xs font-bold text-foreground">{txn.description}</p>
                          <p className="text-[10px] text-muted-foreground">{txn.date}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p
                          className={`text-sm font-black ${
                            isCredit ? "text-emerald-600 dark:text-emerald-400" : "text-foreground"
                          }`}
                        >
                          {isCredit ? "+" : "-"}₹{txn.amount.toLocaleString("en-IN")}
                        </p>
                        <span className="text-[10px] font-semibold text-muted-foreground capitalize">
                          {txn.status}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          </div>
        )}
      </div>

      <Toaster />
    </PartnerLayout>
  );
}
