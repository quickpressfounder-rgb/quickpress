import { CheckCircle2, IndianRupee, ShoppingBag, Star, TrendingUp, Users } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import type { ShopStatistics } from "../../data/partner-shop-mock";

function StatCard({
  icon: Icon,
  label,
  value,
  hint,
  iconBg,
  iconColor,
}: {
  icon: LucideIcon;
  label: string;
  value: string | number;
  hint: string;
  iconBg: string;
  iconColor: string;
}) {
  return (
    <div className="flex flex-col justify-between rounded-3xl border border-zinc-200/80 bg-white p-4 shadow-xs transition-all hover:shadow-sm">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-black uppercase tracking-wider text-zinc-400">
          {label}
        </span>
        <span className={`flex size-9 items-center justify-center rounded-2xl ${iconBg} ${iconColor}`}>
          <Icon className="size-4.5 stroke-[2.4]" />
        </span>
      </div>

      <div className="mt-3">
        <p className="text-xl sm:text-2xl font-black tracking-tight text-zinc-900">
          {value}
        </p>
        <p className="mt-1 flex items-center gap-1 text-[11px] font-bold text-emerald-600">
          <TrendingUp className="size-3 shrink-0" />
          <span>{hint}</span>
        </p>
      </div>
    </div>
  );
}

/** Real database metrics grid — 2 columns on mobile, 4 on desktop. */
export function ShopStatsGrid({ stats }: { stats: ShopStatistics }) {
  const completionRate =
    stats.totalOrders > 0
      ? Math.min(100, Math.round((stats.completedOrders / stats.totalOrders) * 100))
      : 100;

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      <StatCard
        icon={ShoppingBag}
        label="Total Orders"
        value={stats.totalOrders.toLocaleString("en-IN")}
        hint="Lifetime orders recorded"
        iconBg="bg-blue-50"
        iconColor="text-blue-600"
      />
      <StatCard
        icon={CheckCircle2}
        label="Delivered"
        value={stats.completedOrders.toLocaleString("en-IN")}
        hint={`${completionRate}% completion rate`}
        iconBg="bg-emerald-50"
        iconColor="text-emerald-600"
      />
      <StatCard
        icon={IndianRupee}
        label="Total Revenue"
        value={`₹${stats.revenue.toLocaleString("en-IN")}`}
        hint="Settled store earnings"
        iconBg="bg-purple-50"
        iconColor="text-purple-600"
      />
      <StatCard
        icon={Users}
        label="Customers"
        value={stats.activeCustomers.toLocaleString("en-IN")}
        hint="Unique customer phone"
        iconBg="bg-amber-50"
        iconColor="text-amber-600"
      />
    </div>
  );
}

