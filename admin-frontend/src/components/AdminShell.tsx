import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import {
  Bell,
  ChevronDown,
  LogOut,
  Menu,
  Moon,
  Search,
  Shield,
  Sun,
  UserCog,
  Sparkles,
  Zap,
  CheckCircle2,
  HelpCircle,
  ExternalLink,
  ShieldAlert,
  Lock,
  ArrowRight,
  ShieldCheck,
  UserCheck,
} from "lucide-react";
import { toast } from "sonner";


import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/shared/ui/dropdown-menu";
import { Input } from "@/shared/ui/input";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/shared/ui/sheet";
import { adminNavItems, adminRoutes } from "../navigation/admin-routes";
import { useTheme } from "../hooks/use-theme";
import { adminLogout } from "../api/auth";
import { readSession, subscribeSession } from "../api/core/session-store";
import type { Account, AuthSession } from "@/shared/types";

const NAV_GROUPS = [
  {
    title: "OPERATIONS",
    items: ["dashboard", "orders", "customers", "partners", "riders"],
  },
  {
    title: "CATALOG & NETWORK",
    items: ["services", "cities"],
  },
  {
    title: "FINANCE & GROWTH",
    items: ["finance-engine", "wallet", "coupons", "memberships", "analytics"],
  },
  {
    title: "SYSTEM & GOVERNANCE",
    items: ["notifications", "support", "staff", "settings"],
  },
];

export function isSuperAdminAccount(account?: Account | null): boolean {
  if (!account) return true;
  const role = String(account.role || "").toLowerCase();
  const dept = String(account.departmentRole || "").toLowerCase();
  const email = String(account.email || "").toLowerCase();
  const perms = account.permissions || [];

  if (
    role === "super_admin" ||
    role === "admin" ||
    role === "owner" ||
    !role ||
    dept.includes("admin") ||
    dept.includes("super") ||
    dept.includes("administrator") ||
    email === "himanshupalsingh6@gmail.com" ||
    email.includes("admin") ||
    perms.length === 0 ||
    perms.includes("all") ||
    perms.includes("*")
  ) {
    return true;
  }
  return false;
}

export function canAccessModule(moduleId: string, account?: Account | null): boolean {
  // If super admin or no restrictive account -> allow all modules
  if (!account) return true;
  if (isSuperAdminAccount(account)) return true;

  // Operations Dashboard is always visible to any authenticated operator
  if (moduleId === "dashboard") return true;

  const perms = account.permissions || [];
  if (perms.length === 0) return true;
  if (perms.includes("all") || perms.includes("*")) return true;
  if (perms.includes(moduleId)) return true;

  // Semantic permission alias mappings
  const moduleAliases: Record<string, string[]> = {
    "finance-engine": ["finance", "finance-engine", "rules", "payouts", "settlement"],
    wallet: ["finance", "payouts", "wallet"],
    coupons: ["campaigns", "marketing", "coupons"],
    memberships: ["growth", "memberships"],
    analytics: ["reports", "analytics", "insights"],
    services: ["catalog", "services"],
    cities: ["locations", "zones", "cities", "territory"],
    support: ["helpdesk", "support", "tickets"],
    staff: ["staff", "rbac", "team", "security"],
    settings: ["settings", "governance", "platform"],
    orders: ["orders", "dispatch", "live"],
    customers: ["customers", "users"],
    partners: ["partners", "stores", "merchants"],
    riders: ["riders", "fleet", "captains"],
    notifications: ["notifications", "broadcasts"],
  };

  const aliases = moduleAliases[moduleId] || [];
  return aliases.some((alias) => perms.includes(alias));
}

function getAvatarInitials(name?: string, email?: string): string {
  if (name && name.trim()) {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length >= 2 && parts[0] && parts[1]) {
      const first = parts[0][0] || "";
      const second = parts[1][0] || "";
      return (first + second).toUpperCase();
    }
    if (parts.length >= 1 && parts[0]) {
      return parts[0].slice(0, 2).toUpperCase();
    }
  }
  if (email && email.trim()) {
    return email.slice(0, 2).toUpperCase();
  }
  return "QP";
}

function SidebarNav({
  onNavigate,
  account,
}: {
  onNavigate?: () => void;
  account?: Account | null | undefined;
}) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <nav className="flex-1 space-y-6 overflow-y-auto px-3.5 py-4 scrollbar-thin scrollbar-thumb-zinc-200">
      {NAV_GROUPS.map((group) => {
        // Filter items strictly by user's assigned permissions
        const groupItems = adminNavItems.filter(
          (i) => group.items.includes(i.id) && canAccessModule(i.id, account)
        );

        // If the entire group has 0 assigned permissions for this staff member, hide the group completely
        if (groupItems.length === 0) return null;

        return (
          <div key={group.title} className="space-y-1.5">
            <p className="px-3 text-[10px] font-black uppercase tracking-wider text-zinc-400">
              {group.title}
            </p>
            <div className="space-y-1">
              {groupItems.map((item) => {
                const active =
                  pathname === item.to ||
                  (item.to !== "/dashboard" && pathname.startsWith(`${item.to}/`));
                const Icon = item.icon;

                return (
                  <Link
                    key={item.id}
                    to={item.to}
                    onClick={onNavigate}
                    className={`group relative flex items-center justify-between rounded-xl px-3 py-2.5 text-xs font-bold transition-all ${active
                        ? "bg-emerald-50 text-emerald-800 font-extrabold border border-emerald-200 shadow-sm"
                        : "text-zinc-600 hover:bg-zinc-100/80 hover:text-zinc-900 border border-transparent"
                      }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div
                        className={`flex size-7 items-center justify-center rounded-lg transition-colors ${active
                            ? "bg-emerald-600 text-white shadow-sm"
                            : "bg-zinc-100 text-zinc-500 group-hover:bg-zinc-200 group-hover:text-zinc-900"
                          }`}
                      >
                        <Icon className="size-3.5" />
                      </div>
                      <span>{item.label}</span>
                    </div>

                    {active && (
                      <span className="size-1.5 rounded-full bg-emerald-600" />
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        );
      })}
    </nav>
  );
}

function BrandBlock({ account }: { account?: Account | null | undefined }) {
  const isSuper = isSuperAdminAccount(account);
  const deptTitle = isSuper ? "Master Operations Console" : (account?.departmentRole || "Staff Console");

  return (
    <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-4.5 bg-white">
      <div className="flex items-center gap-2.5">
        <div className="flex size-9 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 text-white shadow-md shadow-emerald-500/20">
          <Shield className="size-4.5" />
        </div>
        <div className="leading-tight">
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-black tracking-tight text-[#111827]">
              Quick<span className="text-[#16A34A]">Press</span>
            </span>
            <span
              className={`rounded px-1.5 py-0.2 text-[9px] font-black border ${isSuper
                  ? "bg-emerald-100 text-emerald-900 border-emerald-300"
                  : "bg-blue-100 text-blue-900 border-blue-300"
                }`}
            >
              {isSuper ? "ADMIN" : "STAFF"}
            </span>
          </div>
          <p className="truncate text-[10px] font-semibold text-zinc-500 max-w-[145px]">
            {deptTitle}
          </p>
        </div>
      </div>
    </div>
  );
}

export function AdminShell({
  title,
  subtitle,
  actions,
  children,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  const { theme, toggle } = useTheme();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [mobileOpen, setMobileOpen] = useState(false);

  // Active Session and RBAC identity
  const [session, setSession] = useState<AuthSession | null>(() => readSession("admin"));

  useEffect(() => {
    setSession(readSession("admin"));
    const unsubscribe = subscribeSession(() => {
      setSession(readSession("admin"));
    });
    return unsubscribe;
  }, []);

  const account = session?.account;
  const isSuper = isSuperAdminAccount(account);
  const staffName = account?.name || (isSuper ? "Himanshu Pal Singh" : "Staff Member");
  const staffEmail = account?.email || "himanshupalsingh6@gmail.com";
  const staffRole = account?.departmentRole || (isSuper ? "Super Administrator" : "Operations Staff");
  const staffScope = account?.scope || "All India Hubs";
  const avatarLetters = getAvatarInitials(staffName, staffEmail);

  // Identify current module based on route
  const currentNavEntry = adminNavItems.find(
    (item) =>
      pathname === item.to ||
      (item.to !== "/dashboard" && pathname.startsWith(`${item.to}/`))
  );
  const currentModuleId =
    currentNavEntry?.id ||
    (pathname === "/" || pathname === "/dashboard"
      ? "dashboard"
      : pathname.replace(/^\//, "").split("/")[0] || "dashboard");
  const isModuleAllowed = canAccessModule(currentModuleId, account);

  // Global Search State
  const [searchQuery, setSearchQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<any | null>(null);

  const handleSearchInput = async (val: string) => {
    setSearchQuery(val);
    if (!val.trim()) {
      setSearchResults(null);
      setSearchOpen(false);
      return;
    }
    setSearchOpen(true);
    setIsSearching(true);
    try {
      const { searchGlobal } = await import("../api/dashboard");
      const res = await searchGlobal(val);
      setSearchResults(res);
    } catch {
      /* ignore */
    } finally {
      setIsSearching(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await adminLogout();
      toast.success("Signed out successfully.");
      navigate({ to: adminRoutes.auth });
    } catch {
      navigate({ to: adminRoutes.auth });
    }
  };

  return (
    <div className="flex min-h-screen bg-[#F8FAFC] text-[#111827] font-sans antialiased selection:bg-emerald-500 selection:text-white">
      {/* Desktop Sticky Sidebar */}
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-zinc-200 bg-white lg:flex">
        <BrandBlock account={account} />
        <SidebarNav account={account} />

        {/* Bottom Operator Identity Card */}
        <div className="border-t border-zinc-200 p-3.5 bg-zinc-50/70">
          <div className="flex items-center justify-between rounded-xl bg-white border border-zinc-200 p-2.5 shadow-sm">
            <div className="flex items-center gap-2 min-w-0">
              <div className="size-6 rounded-md border border-emerald-500/40 shrink-0 flex items-center justify-center bg-emerald-600 text-white font-black text-[10px]">
                {avatarLetters}
              </div>
              <div className="text-[11px] leading-tight min-w-0">
                <p className="truncate font-bold text-zinc-900">{staffName}</p>
                <p className="truncate text-[9px] text-emerald-700 font-semibold">{staffRole}</p>
              </div>
            </div>
            <button
              onClick={() => toast.info(`Assigned Territory: ${staffScope}`)}
              className="text-zinc-400 hover:text-zinc-700 p-1 shrink-0"
              title={`Scope: ${staffScope}`}
            >
              <ShieldCheck className="size-3.5 text-emerald-600" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top Floating Header */}
        <header className="sticky top-0 z-20 border-b border-zinc-200 bg-white/90 backdrop-blur-xl shadow-xs">
          <div className="flex items-center gap-3 px-4 py-3 sm:px-6">
            {/* Mobile Sheet Trigger */}
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild>
                <button
                  type="button"
                  className="flex size-9 items-center justify-center rounded-xl border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-100 lg:hidden active:scale-95 shadow-sm"
                  aria-label="Open menu"
                >
                  <Menu className="size-4" />
                </button>
              </SheetTrigger>
              <SheetContent side="left" className="w-72 p-0 bg-white text-zinc-900 border-zinc-200">
                <SheetTitle className="sr-only">Admin Navigation</SheetTitle>
                <BrandBlock account={account} />
                <SidebarNav account={account} onNavigate={() => setMobileOpen(false)} />
              </SheetContent>
            </Sheet>

            {/* Page Title & Subtitle */}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h1 className="truncate text-base sm:text-lg font-black tracking-tight text-zinc-900">
                  {title}
                </h1>
                <span className="hidden sm:inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                  <CheckCircle2 className="size-3" />
                  <span>Realtime Sync</span>
                </span>
              </div>
              {subtitle ? (
                <p className="hidden truncate text-xs font-medium text-zinc-500 sm:block">
                  {subtitle}
                </p>
              ) : null}
            </div>

            {/* Search Bar with Live Server-Side Auto-Suggest */}
            <div className="relative hidden md:block">
              <Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-zinc-400" />
              <input
                value={searchQuery}
                onChange={(e) => handleSearchInput(e.target.value)}
                onFocus={() => {
                  if (searchQuery.trim()) setSearchOpen(true);
                }}
                placeholder="Search orders, customers, partners, riders..."
                className="h-9 w-72 rounded-xl border border-zinc-200 bg-zinc-50 pl-9 pr-3 text-xs text-zinc-900 placeholder:text-zinc-400 focus:border-emerald-600 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-600 shadow-xs"
              />
              {isSearching && (
                <span className="absolute right-3 top-1/2 -translate-y-1/2 size-3 animate-spin rounded-full border-2 border-emerald-600 border-t-transparent" />
              )}

              {/* Global Search Results Dropdown */}
              {searchOpen && searchResults && (
                <div className="absolute right-0 top-11 z-50 w-96 rounded-2xl border border-zinc-200 bg-white p-3 shadow-xl backdrop-blur-md">
                  <div className="flex items-center justify-between pb-2 border-b border-zinc-100">
                    <span className="text-[11px] font-black uppercase tracking-wider text-zinc-500">
                      Search Results ({searchResults.total})
                    </span>
                    <button
                      type="button"
                      onClick={() => setSearchOpen(false)}
                      className="text-xs text-zinc-400 hover:text-zinc-600"
                    >
                      ✕
                    </button>
                  </div>

                  <div className="mt-2 max-h-80 overflow-y-auto space-y-3 scrollbar-thin">
                    {/* Orders */}
                    {searchResults.results.orders.length > 0 && canAccessModule("orders", account) && (
                      <div>
                        <p className="text-[10px] font-extrabold uppercase text-emerald-700">Orders</p>
                        <div className="mt-1 space-y-1">
                          {searchResults.results.orders.map((ord: any) => (
                            <div
                              key={ord.id}
                              onClick={() => {
                                setSearchOpen(false);
                                navigate({ to: adminRoutes.orders });
                              }}
                              className="flex items-center justify-between rounded-lg p-1.5 hover:bg-zinc-50 cursor-pointer text-xs"
                            >
                              <div>
                                <span className="font-bold text-zinc-900">#{ord.code}</span>
                                <span className="text-zinc-500 text-[11px] ml-1.5">{ord.customer}</span>
                              </div>
                              <span className="text-[10px] font-bold uppercase rounded bg-zinc-100 px-1.5 py-0.5 text-zinc-600">
                                {ord.status}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Customers */}
                    {searchResults.results.customers.length > 0 && canAccessModule("customers", account) && (
                      <div>
                        <p className="text-[10px] font-extrabold uppercase text-sky-700">Customers</p>
                        <div className="mt-1 space-y-1">
                          {searchResults.results.customers.map((cust: any) => (
                            <div
                              key={cust.id}
                              onClick={() => {
                                setSearchOpen(false);
                                navigate({ to: adminRoutes.customers });
                              }}
                              className="flex items-center justify-between rounded-lg p-1.5 hover:bg-zinc-50 cursor-pointer text-xs"
                            >
                              <span className="font-bold text-zinc-900">{cust.name}</span>
                              <span className="text-zinc-500 text-[11px]">{cust.phone}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Partners */}
                    {searchResults.results.partners.length > 0 && canAccessModule("partners", account) && (
                      <div>
                        <p className="text-[10px] font-extrabold uppercase text-amber-700">Partners</p>
                        <div className="mt-1 space-y-1">
                          {searchResults.results.partners.map((prt: any) => (
                            <div
                              key={prt.id}
                              onClick={() => {
                                setSearchOpen(false);
                                navigate({ to: adminRoutes.partners });
                              }}
                              className="flex items-center justify-between rounded-lg p-1.5 hover:bg-zinc-50 cursor-pointer text-xs"
                            >
                              <span className="font-bold text-zinc-900">{prt.name}</span>
                              <span className="text-zinc-500 text-[11px]">{prt.city}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Riders */}
                    {searchResults.results.riders.length > 0 && canAccessModule("riders", account) && (
                      <div>
                        <p className="text-[10px] font-extrabold uppercase text-purple-700">Riders</p>
                        <div className="mt-1 space-y-1">
                          {searchResults.results.riders.map((rdr: any) => (
                            <div
                              key={rdr.id}
                              onClick={() => {
                                setSearchOpen(false);
                                navigate({ to: adminRoutes.riders });
                              }}
                              className="flex items-center justify-between rounded-lg p-1.5 hover:bg-zinc-50 cursor-pointer text-xs"
                            >
                              <span className="font-bold text-zinc-900">{rdr.name}</span>
                              <span
                                className={`text-[10px] font-bold ${rdr.isOnline ? "text-emerald-600" : "text-zinc-400"
                                  }`}
                              >
                                {rdr.isOnline ? "● Online" : "Offline"}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {searchResults.total === 0 && (
                      <p className="text-xs text-zinc-500 text-center py-4">No matching records found.</p>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Notification Bell (Only if granted) */}
            {canAccessModule("notifications", account) && (
              <button
                type="button"
                onClick={() => navigate({ to: adminRoutes.notifications })}
                className="relative flex size-9 items-center justify-center rounded-xl border border-zinc-200 bg-white text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-900 shadow-sm"
              >
                <Bell className="size-4" />
                <span className="absolute top-2 right-2 size-2 rounded-full bg-emerald-600" />
              </button>
            )}

            {/* Admin / Staff Avatar & Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="flex items-center gap-2.5 rounded-xl border border-zinc-200 bg-white p-1.5 pr-2.5 text-left transition-colors hover:bg-zinc-50 shadow-sm"
                >
                  <div className="size-7 rounded-lg border border-emerald-500/40 shrink-0 flex items-center justify-center bg-emerald-600 text-white font-black text-xs">
                    {avatarLetters}
                  </div>
                  <div className="hidden sm:block leading-none text-left">
                    <p className="truncate text-xs font-black text-zinc-900 max-w-[130px]">
                      {staffName}
                    </p>
                    <p className="truncate text-[10px] text-emerald-700 font-semibold max-w-[130px]">
                      {staffRole}
                    </p>
                  </div>
                  <ChevronDown className="size-3 text-zinc-400 shrink-0" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="w-56 rounded-2xl bg-white border-zinc-200 text-zinc-900 shadow-xl p-1.5"
              >
                <DropdownMenuLabel className="px-2.5 py-2">
                  <p className="text-xs font-black text-zinc-900">{staffName}</p>
                  <p className="text-[10px] text-zinc-500 truncate">{staffEmail}</p>
                  <div className="mt-1.5 flex items-center gap-1.5">
                    <span className="rounded bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 text-[9px] font-bold text-emerald-700">
                      {staffRole}
                    </span>
                    <span className="rounded bg-zinc-100 border border-zinc-200 px-1.5 py-0.5 text-[9px] font-medium text-zinc-600">
                      {staffScope}
                    </span>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-zinc-100" />

                {/* Only display Staff & Roles if authorized */}
                {canAccessModule("staff", account) && (
                  <DropdownMenuItem
                    onClick={() => navigate({ to: adminRoutes.staff })}
                    className="rounded-xl px-2.5 py-2 text-xs font-bold text-zinc-700 hover:bg-zinc-100 cursor-pointer"
                  >
                    <UserCog className="mr-2 size-4 text-emerald-600" />
                    <span>Staff & Roles</span>
                  </DropdownMenuItem>
                )}

                {/* Only display Settings if authorized */}
                {canAccessModule("settings", account) && (
                  <DropdownMenuItem
                    onClick={() => navigate({ to: adminRoutes.settings })}
                    className="rounded-xl px-2.5 py-2 text-xs font-bold text-zinc-700 hover:bg-zinc-100 cursor-pointer"
                  >
                    <HelpCircle className="mr-2 size-4 text-amber-600" />
                    <span>Platform Settings</span>
                  </DropdownMenuItem>
                )}

                <DropdownMenuSeparator className="bg-zinc-100" />
                <DropdownMenuItem
                  onClick={handleSignOut}
                  className="rounded-xl px-2.5 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 cursor-pointer"
                >
                  <LogOut className="mr-2 size-4" />
                  <span>Lock & Sign Out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Content wrapper with strict RBAC permission check */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 space-y-6">
          {!isModuleAllowed ? (
            <div className="flex flex-col items-center justify-center min-h-[60vh] p-4 text-center">
              <div className="max-w-md w-full rounded-3xl border border-rose-200 bg-white p-8 shadow-xl">
                <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-2xl bg-rose-50 border border-rose-200 text-rose-600 shadow-inner">
                  <ShieldAlert className="size-7" />
                </div>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-100 border border-rose-200 px-3 py-1 text-[11px] font-black uppercase tracking-wide text-rose-800">
                  Module Not Assigned
                </span>
                <h2 className="mt-3 text-lg font-black text-zinc-900">
                  Access Restricted
                </h2>
                <p className="mt-2 text-xs text-zinc-600 leading-relaxed">
                  The <strong>{currentNavEntry?.label || (currentModuleId ? currentModuleId.toUpperCase() : "REQUESTED")}</strong> module has not been assigned to your staff profile by the Administrator.
                </p>

                <div className="mt-5 rounded-2xl bg-zinc-50 border border-zinc-200 p-3.5 text-left space-y-2 text-xs">
                  <div className="flex justify-between items-center text-zinc-600">
                    <span className="font-medium">Operator Name:</span>
                    <span className="font-bold text-zinc-900">{staffName}</span>
                  </div>
                  <div className="flex justify-between items-center text-zinc-600">
                    <span className="font-medium">Assigned Role:</span>
                    <span className="font-bold text-emerald-700">{staffRole}</span>
                  </div>
                  <div className="flex justify-between items-center text-zinc-600">
                    <span className="font-medium">Assigned Scope:</span>
                    <span className="font-bold text-zinc-900">{staffScope}</span>
                  </div>
                </div>

                <div className="mt-6 flex flex-col sm:flex-row justify-center gap-2">
                  <Button
                    onClick={() => navigate({ to: adminRoutes.dashboard })}
                    className="rounded-xl bg-emerald-600 px-5 text-xs font-bold text-white hover:bg-emerald-700"
                  >
                    Return to Dashboard
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <>
              {actions ? (
                <div className="flex flex-wrap items-center justify-between gap-3 pb-2 border-b border-zinc-200">
                  <div className="text-xs text-zinc-500 font-medium">
                    QuickPress Operations Console · {staffRole}
                  </div>
                  <div className="flex items-center gap-2">{actions}</div>
                </div>
              ) : null}

              {children}
            </>
          )}
        </main>
      </div>
    </div>
  );
}