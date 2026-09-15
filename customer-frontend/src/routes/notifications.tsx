import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  BadgePercent,
  Bell,
  BellOff,
  Crown,
  CheckCheck,
  CheckCircle2,
  CloudOff,
  Gift,
  Loader2,
  Package,
  PackageCheck,
  RefreshCw,
  Search,
  Shield,
  Sparkles,
  Store,
  Ticket,
  Trash2,
  Truck,
  Wallet,
  WashingMachine,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  getNotificationPermission,
  requestPushNotificationPermission,
} from "@/api/core/firebase-messaging";

import { BottomNav } from "@/components/home/BottomNav";
import { NotificationsSkeleton } from "@/components/rewards/RewardsSkeletons";
import { ScreenTopBar } from "@/components/rewards/ScreenTopBar";
import { Toaster } from "@/shared/ui/sonner";
import { isOnline, onNetworkChange } from "@/api/customer/api/network";
import {
  NOTIFICATION_FILTERS,
  NOTIFICATION_PAGE_SIZE,
  deleteNotification,
  fetchNotificationPage,
  markAllNotificationsRead,
  markNotificationRead,
  syncPendingNotificationActions,
  type AppNotification,
  type NotificationFilter,
  type NotificationGroup,
  type NotificationKind,
} from "@/api/customer/notifications-api";
import { useAuthGuard } from "@/hooks/useAuthGuard";

export const Route = createFileRoute("/notifications")({
  head: () => ({
    meta: [
      { title: "Notifications — QuickPress Order & Offer Updates" },
      {
        name: "description",
        content:
          "Stay on top of QuickPress pickup, processing and delivery updates, wallet cashback credits, coupon drops and account alerts in one clean feed.",
      },
      { property: "og:title", content: "Notifications — QuickPress Order & Offer Updates" },
      {
        property: "og:description",
        content:
          "Pickup, processing and delivery alerts plus wallet and offer updates for your QuickPress laundry orders.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: NotificationsScreen,
});

const KIND_META: Record<NotificationKind, { icon: typeof Bell; tone: string }> = {
  "partner-accepted": { icon: Store, tone: "bg-primary/15 text-brand-dark" },
  "pickup-scheduled": { icon: Package, tone: "bg-primary/15 text-brand-dark" },
  "pickup-completed": { icon: PackageCheck, tone: "bg-secondary/10 text-brand-green" },
  processing: { icon: WashingMachine, tone: "bg-primary/15 text-brand-dark" },
  "out-for-delivery": { icon: Truck, tone: "bg-secondary/10 text-brand-green" },
  delivered: { icon: CheckCircle2, tone: "bg-secondary/10 text-brand-green" },
  wallet: { icon: Wallet, tone: "bg-primary/15 text-brand-dark" },
  cashback: { icon: Sparkles, tone: "bg-secondary/10 text-brand-green" },
  offer: { icon: BadgePercent, tone: "bg-primary/15 text-brand-dark" },
  coupon: { icon: Ticket, tone: "bg-primary/15 text-brand-dark" },
  system: { icon: Shield, tone: "bg-muted text-muted-foreground" },
  "order-new": { icon: Package, tone: "bg-primary/15 text-brand-dark" },
  "order-cancelled": { icon: BellOff, tone: "bg-destructive/10 text-destructive" },
  "rider-assigned": { icon: Truck, tone: "bg-primary/15 text-brand-dark" },
  membership: { icon: Crown, tone: "bg-primary/15 text-brand-dark" },
  referral: { icon: Gift, tone: "bg-secondary/10 text-brand-green" },
};

const GROUPS: { id: NotificationGroup; label: string }[] = [
  { id: "today", label: "Today" },
  { id: "yesterday", label: "Yesterday" },
  { id: "earlier", label: "Earlier" },
];

function NotificationsScreen() {
  useAuthGuard();
  const navigate = useNavigate();

  const [items, setItems] = useState<AppNotification[] | null>(null);
  const [unread, setUnread] = useState(0);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [offline, setOffline] = useState(false);
  const [cached, setCached] = useState(false);
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<NotificationFilter>("all");
  const [notifPermission, setNotifPermission] = useState<NotificationPermission>("default");
  const sentinel = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setNotifPermission(getNotificationPermission());
  }, []);

  /* Debounce the search box so typing never floods the API. */
  useEffect(() => {
    const timer = window.setTimeout(() => setQuery(search.trim()), 320);
    return () => window.clearTimeout(timer);
  }, [search]);

  const load = useCallback(
    async (options: { page?: number; append?: boolean; refresh?: boolean } = {}) => {
      const target = options.page ?? 1;
      if (options.append) setLoadingMore(true);
      else if (options.refresh) setRefreshing(true);
      else setItems(null);
      setError(null);

      try {
        const result = await fetchNotificationPage({
          page: target,
          limit: NOTIFICATION_PAGE_SIZE,
          search: query,
          filter,
          forceRefresh: options.refresh === true,
        });
        setItems((prev) =>
          options.append && prev
            ? [...prev, ...result.items.filter((item) => !prev.some((p) => p.id === item.id))]
            : result.items,
        );
        setUnread(result.unread);
        setPage(result.page);
        setHasMore(result.hasMore);
        setCached(result.fromCache);
      } catch {
        if (!options.append) setItems(null);
        setError(
          isOnline()
            ? "We couldn't load your notifications."
            : "You're offline and nothing is cached yet.",
        );
      } finally {
        setLoadingMore(false);
        setRefreshing(false);
      }
    },
    [filter, query],
  );

  useEffect(() => {
    void load();
  }, [load]);

  /* Connectivity: replay queued actions and refresh when the device is back. */
  useEffect(() => {
    setOffline(!isOnline());
    return onNetworkChange((online) => {
      setOffline(!online);
      if (online) {
        void syncPendingNotificationActions().then(() => load({ refresh: true }));
      }
    });
  }, [load]);

  /* Infinite scroll. */
  useEffect(() => {
    const node = sentinel.current;
    if (!node || !hasMore || loadingMore || items === null) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          void load({ page: page + 1, append: true });
        }
      },
      { rootMargin: "160px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [hasMore, items, load, loadingMore, page]);

  /* Pull to refresh — the same gesture used across the app. */
  useEffect(() => {
    if (typeof window === "undefined") return;
    let startY: number | null = null;
    const onStart = (event: TouchEvent) => {
      startY = window.scrollY <= 2 ? (event.touches[0]?.clientY ?? null) : null;
    };
    const onEnd = (event: TouchEvent) => {
      if (startY === null) return;
      const delta = (event.changedTouches[0]?.clientY ?? 0) - startY;
      startY = null;
      if (delta > 90) void load({ refresh: true });
    };
    window.addEventListener("touchstart", onStart, { passive: true });
    window.addEventListener("touchend", onEnd, { passive: true });
    return () => {
      window.removeEventListener("touchstart", onStart);
      window.removeEventListener("touchend", onEnd);
    };
  }, [load]);

  const visibleUnread = useMemo(
    () => (items ?? []).filter((item) => !item.read).length,
    [items],
  );

  const handleMarkAll = async () => {
    if (!items || unread === 0) return;
    setItems(items.map((item) => ({ ...item, read: true })));
    setUnread(0);
    const result = await markAllNotificationsRead();
    toast.success(
      result.ok ? "All notifications marked as read" : "Saved offline — will sync when online",
    );
  };

  const handleOpen = async (item: AppNotification) => {
    if (!item.read) {
      setItems((prev) =>
        (prev ?? []).map((entry) => (entry.id === item.id ? { ...entry, read: true } : entry)),
      );
      setUnread((prev) => Math.max(0, prev - 1));
      const result = await markNotificationRead(item.id);
      setUnread(result.unread);
    }
    if (item.orderId) {
      void navigate({ to: "/track/$orderId", params: { orderId: item.orderId } });
      return;
    }
    toast(item.title);
  };

  const handleDelete = async (id: string) => {
    const target = (items ?? []).find((entry) => entry.id === id);
    setItems((prev) => (prev ?? []).filter((entry) => entry.id !== id));
    if (target && !target.read) setUnread((prev) => Math.max(0, prev - 1));
    const result = await deleteNotification(id);
    setUnread(result.unread);
    toast.success(result.ok ? "Notification removed" : "Removed offline — will sync when online");
  };

  const isFiltering = query.length > 0 || filter !== "all";

  return (
    <main className="relative min-h-screen overflow-x-hidden scroll-smooth bg-white dark:bg-zinc-950">
      <div className="relative mx-auto w-full max-w-md">
        <ScreenTopBar
          title="Notifications"
          action={
            <button
              type="button"
              aria-label="Mark all as read"
              onClick={() => void handleMarkAll()}
              disabled={unread === 0}
              className="relative flex size-10 items-center justify-center rounded-2xl bg-muted text-foreground transition-all duration-300 hover:bg-accent active:scale-[0.94] disabled:opacity-40"
            >
              <CheckCheck className="size-5" />
              {unread > 0 ? (
                <span className="absolute -right-1 -top-1 flex min-w-[1.1rem] items-center justify-center rounded-full bg-secondary px-1 text-[0.6rem] font-black text-secondary-foreground">
                  {unread > 99 ? "99+" : unread}
                </span>
              ) : null}
            </button>
          }
        />

        <div className="px-5 pt-4">
          <label className="card-soft flex items-center gap-2 border border-border px-4 py-3">
            <Search className="size-4 shrink-0 text-muted-foreground" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search notifications"
              aria-label="Search notifications"
              className="min-w-0 flex-1 bg-transparent text-xs font-semibold tracking-tight text-foreground outline-none placeholder:font-medium placeholder:text-muted-foreground"
            />
            {refreshing ? (
              <Loader2 className="size-4 shrink-0 animate-spin text-muted-foreground" />
            ) : null}
          </label>

          <div className="-mx-5 mt-3 flex gap-2 overflow-x-auto px-5 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {NOTIFICATION_FILTERS.map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => setFilter(option.id)}
                aria-pressed={filter === option.id}
                className={`shrink-0 rounded-full px-4 py-2 text-[0.68rem] font-bold tracking-tight transition-all duration-300 active:scale-[0.95] ${
                  filter === option.id
                    ? "bg-primary/20 text-brand-dark"
                    : "bg-muted text-muted-foreground hover:bg-accent"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>

          {/* Push Notification Enable Prompt (Only when not granted) */}
          {notifPermission !== "granted" && (
            <div className="card-soft mt-3.5 flex items-center justify-between gap-3 border border-emerald-500/25 bg-emerald-500/5 px-4 py-3 rounded-2xl dark:border-emerald-500/20 dark:bg-emerald-950/20">
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-xs">
                  <Bell className="size-4.5" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-black text-zinc-900 dark:text-white">
                    Order Bell & Live Alerts
                  </p>
                  <p className="text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 truncate">
                    Enable real-time push notifications
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={async () => {
                  const token = await requestPushNotificationPermission();
                  setNotifPermission(getNotificationPermission());
                  if (token || getNotificationPermission() === "granted") {
                    toast.success("Notifications Enabled! 🔔");
                  }
                }}
                className="rounded-xl bg-emerald-600 px-3.5 py-1.5 text-[11px] font-black text-white shadow-xs hover:bg-emerald-700 active:scale-95 transition-all shrink-0"
              >
                Enable
              </button>
            </div>
          )}

          {offline || cached ? (
            <div className="card-soft mt-3 flex items-center gap-2 border border-border px-4 py-3">
              <CloudOff className="size-4 shrink-0 text-muted-foreground" />
              <p className="text-[0.68rem] font-semibold tracking-tight text-muted-foreground">
                {offline
                  ? "You're offline — showing saved notifications. Actions sync automatically."
                  : "Showing saved notifications while we reconnect."}
              </p>
            </div>
          ) : null}
        </div>

        {items === null && !error ? (
          <NotificationsSkeleton />
        ) : error ? (
          <div className="px-5 pb-32 pt-4">
            <div className="card-soft border border-border px-5 py-14 text-center">
              <span className="mx-auto flex size-16 items-center justify-center rounded-3xl bg-destructive/10 text-destructive">
                <CloudOff className="size-7" />
              </span>
              <p className="mt-4 text-sm font-black tracking-tight text-foreground">{error}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Check your connection and try again.
              </p>
              <button
                type="button"
                onClick={() => void load()}
                className="mt-5 inline-flex items-center gap-2 rounded-full bg-primary/15 px-5 py-2.5 text-[0.68rem] font-bold tracking-tight text-brand-dark transition-all duration-300 hover:bg-primary/25 active:scale-[0.95]"
              >
                <RefreshCw className="size-4" />
                Retry
              </button>
            </div>
          </div>
        ) : (items ?? []).length === 0 ? (
          <div className="px-5 pb-32 pt-4">
            <div className="card-soft border border-border px-5 py-14 text-center">
              <span className="mx-auto flex size-16 items-center justify-center rounded-3xl bg-secondary/10 text-brand-green">
                <BellOff className="size-7" />
              </span>
              <p className="mt-4 text-sm font-black tracking-tight text-foreground">
                {isFiltering ? "No matching notifications" : "No notifications yet"}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {isFiltering
                  ? "Try a different search or filter."
                  : "Order updates, cashback credits and offers will appear right here."}
              </p>
            </div>
          </div>
        ) : (
          <div className="px-5 pb-32 pt-4">
            {visibleUnread > 0 ? (
              <div className="card-soft flex items-center justify-between gap-3 border border-border px-4 py-3">
                <p className="text-xs font-bold tracking-tight text-foreground">
                  {unread} unread update{unread > 1 ? "s" : ""}
                </p>
                <button
                  type="button"
                  onClick={() => void handleMarkAll()}
                  className="shrink-0 rounded-full bg-primary/15 px-4 py-2 text-[0.68rem] font-bold tracking-tight text-brand-dark transition-all duration-300 hover:bg-primary/25 active:scale-[0.95]"
                >
                  Mark all as read
                </button>
              </div>
            ) : null}

            {GROUPS.map((group) => {
              const groupItems = (items ?? []).filter((item) => item.group === group.id);
              if (groupItems.length === 0) return null;
              return (
                <section key={group.id} className="mt-6 first:mt-5">
                  <h2 className="text-[0.68rem] font-black uppercase tracking-widest text-muted-foreground">
                    {group.label}
                  </h2>
                  <div className="stagger-children mt-3 space-y-3">
                    {groupItems.map((item) => {
                      const meta = KIND_META[item.kind] ?? KIND_META.system;
                      const Icon = meta.icon;
                      return (
                        <article
                          key={item.id} className={`card-soft relative border p-4 transition-all duration-300 hover:border-primary/60 ${
                            item.read ? "border-border" : "border-primary/50 bg-primary/5"
                          }`}
                        >
                          <button
                            type="button"
                            onClick={() => void handleOpen(item)}
                            className="flex w-full items-start gap-3 text-left"
                          >
                            <span
                              className={`flex size-11 shrink-0 items-center justify-center rounded-2xl ${meta.tone}`}
                            >
                              <Icon className="size-5" />
                            </span>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <p className="min-w-0 flex-1 truncate text-sm font-bold tracking-tight text-foreground">
                                  {item.title}
                                </p>
                                {!item.read ? (
                                  <span
                                    aria-label="Unread"
                                    className="size-2 shrink-0 rounded-full bg-secondary"
                                  />
                                ) : null}
                              </div>
                              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                                {item.description}
                              </p>
                              {item.orderCode ? (
                                <span className="mt-2 inline-flex rounded-full bg-muted px-2.5 py-1 text-[0.6rem] font-bold tracking-tight text-muted-foreground">
                                  Order {item.orderCode}
                                </span>
                              ) : null}
                              <p className="mt-2 text-[0.65rem] font-semibold text-muted-foreground">
                                {item.time} · {item.timeAgo}
                              </p>
                            </div>
                          </button>

                          <button
                            type="button"
                            aria-label="Delete notification"
                            onClick={() => void handleDelete(item.id)}
                            className="absolute bottom-3 right-3 flex size-8 items-center justify-center rounded-xl bg-muted text-muted-foreground transition-all duration-300 hover:bg-destructive/10 hover:text-destructive active:scale-[0.92]"
                          >
                            <Trash2 className="size-4" />
                          </button>
                        </article>
                      );
                    })}
                  </div>
                </section>
              );
            })}

            <div ref={sentinel} className="h-6" />
            {loadingMore ? (
              <div className="flex items-center justify-center gap-2 pt-2 text-muted-foreground">
                <Loader2 className="size-4 animate-spin" />
                <span className="text-[0.68rem] font-semibold tracking-tight">
                  Loading more…
                </span>
              </div>
            ) : !hasMore && (items ?? []).length > NOTIFICATION_PAGE_SIZE ? (
              <p className="pt-2 text-center text-[0.65rem] font-semibold text-muted-foreground">
                You're all caught up
              </p>
            ) : null}
          </div>
        )}
      </div>

      <BottomNav active="notifications" />
    </main>
  );
}
