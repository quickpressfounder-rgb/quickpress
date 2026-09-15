import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  ClipboardList,
  Trophy,
  Wallet,
  UserRound,
  LogOut,
  TrendingUp,
  Bell,
} from "lucide-react";

export function RiderSidebar({
  captainName = "Delivery Captain",
  captainId = "CP-9821",
  isOnline = true,
  onToggleStatus,
  onLogout,
}: {
  captainName?: string;
  captainId?: string;
  isOnline?: boolean;
  onToggleStatus?: () => void;
  onLogout?: () => void;
}) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const links = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, to: "/dashboard" },
    { id: "orders", label: "Assigned Orders", icon: ClipboardList, to: "/orders" },
    { id: "wallet", label: "Earnings & Payouts", icon: Wallet, to: "/wallet" },
    { id: "incentives", label: "Incentives & Targets", icon: TrendingUp, to: "/incentives" },
    { id: "leaderboard", label: "City Leaderboard", icon: Trophy, to: "/leaderboard" },
    { id: "notifications", label: "Notifications", icon: Bell, to: "/notifications" },
    { id: "profile", label: "Captain Profile", icon: UserRound, to: "/profile" },
  ];

  const initials = captainName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("") || "CP";

  return (
    <aside className="sticky top-0 hidden h-screen w-64 flex-col border-r border-slate-200 bg-white/95 backdrop-blur-md transition-all duration-300 md:flex lg:w-72 select-none">
      {/* Captain Identity Header */}
      <div className="flex h-20 items-center gap-3 border-b border-slate-100 px-5">
        <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-xs font-black text-sm tracking-tight">
          {initials}
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="truncate font-black text-sm text-slate-900 tracking-tight">
            {captainName}
          </h2>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="size-1.5 rounded-full bg-emerald-500 shrink-0" />
            <p className="text-[11px] font-semibold text-slate-500 truncate">
              ID: {captainId} · Captain
            </p>
          </div>
        </div>
      </div>

      {/* Duty Status Card */}
      <div className="px-5 pt-4">
        <div className="flex items-center justify-between rounded-2xl border border-slate-200/80 bg-slate-50/80 p-3">
          <div className="flex items-center gap-2.5">
            <span
              className={`size-2.5 rounded-full ${
                isOnline
                  ? "bg-emerald-500 shadow-sm shadow-emerald-500/50 animate-pulse"
                  : "bg-slate-400"
              }`}
            />
            <div>
              <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                Duty Status
              </p>
              <p className="text-xs font-bold text-slate-900">
                {isOnline ? "Accepting Orders" : "Duty Off"}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onToggleStatus}
            aria-label="Toggle captain duty status"
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
              isOnline ? "bg-emerald-600" : "bg-slate-300"
            }`}
          >
            <span
              className={`pointer-events-none inline-block size-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                isOnline ? "translate-x-5" : "translate-x-0"
              }`}
            />
          </button>
        </div>
      </div>

      {/* Navigation Links */}
      <nav aria-label="Captain Console" className="flex-1 space-y-1 px-3 py-4">
        {links.map((link) => {
          const isActive = pathname === link.to;
          return (
            <Link
              key={link.id}
              to={link.to}
              className={`group flex items-center gap-3 rounded-2xl px-3.5 py-3 text-xs transition-all ${
                isActive
                  ? "bg-emerald-50 font-black text-emerald-800 shadow-2xs"
                  : "font-semibold text-slate-600 hover:bg-slate-100 hover:text-slate-950"
              }`}
            >
              <link.icon
                className={`size-4.5 transition-transform duration-200 group-hover:scale-110 ${
                  isActive ? "text-emerald-700 stroke-[2.5]" : "text-slate-400"
                }`}
              />
              <span className="flex-1">{link.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Bottom Profile / Logout Card */}
      <div className="border-t border-slate-100 p-4">
        <button
          type="button"
          onClick={onLogout}
          className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-600 hover:bg-rose-50 hover:text-rose-600 transition-colors cursor-pointer"
        >
          <LogOut className="size-4" />
          <span>Logout Session</span>
        </button>
      </div>
    </aside>
  );
}
