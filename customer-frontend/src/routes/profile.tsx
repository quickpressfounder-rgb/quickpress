import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import {
  ArrowDownLeft,
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  BadgeCheck,
  Bell,
  Camera,
  ChevronRight,
  Clock,
  CreditCard,
  Crown,
  Gift,
  Globe,
  Headphones,
  Heart,
  HelpCircle,
  LifeBuoy,
  Loader2,
  Lock,
  Monitor,
  LogOut,
  Mail,
  MapPin,
  MessageCircle,
  Moon,
  Package,
  Pencil,
  RefreshCw,
  Phone,
  Plus,
  Receipt,
  Settings,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Star,
  Store,
  Sun,
  Trash2,
  Truck,
  User,
  Wallet,
  WifiOff,
  X,
  type LucideIcon,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import {
  fetchSavedServices,
  removeSavedService,
  fetchFavouritePartners,
  removeFavouritePartner,
  type SavedServiceItem,
  type FavouritePartnerItem,
} from "@/api/customer/favourites-api";

import { BottomNav } from "@/components/home/BottomNav";
import { ProfileSkeleton } from "@/components/profile/ProfileSkeleton";
import { Toaster } from "@/shared/ui/sonner";
import {
  deleteCustomerAccount,
  fetchProfileData,
  logout,
  updateProfile,
  updateProfilePhoto,
  validateProfile,
  type ProfileData,
} from "@/api/customer/profile-api";
import { isOnline, onNetworkChange } from "@/api/customer/api/network";
import type { NotificationPreferences, ThemeMode } from "@/api/customer/settings-api";
import { useAppSettings } from "@/hooks/useAppSettings";
import { useAuthGuard } from "@/hooks/useAuthGuard";
import { readSavedLocation } from "@/api/customer/services/location-service";
import {
  getDeviceNotificationPermission,
  requestDeviceNotificationPermission,
  openDeviceNotificationSettings,
  sendTestNotification,
  type DevicePermissionStatus,
} from "@/lib/notifications";
import { switchAppLanguage, DEFAULT_LANGUAGE } from "@/lib/i18n";
import defaultAvatar from "@/shared/assets/default-avatar.jpg";



const THEME_OPTIONS: { id: ThemeMode; label: string; icon: LucideIcon }[] = [
  { id: "light", label: "Light", icon: Sun },
  { id: "dark", label: "Dark", icon: Moon },
  { id: "system", label: "System", icon: Monitor },
];

const NOTIFICATION_ROWS: { id: keyof NotificationPreferences; label: string; note: string }[] = [
  { id: "orderUpdates", label: "Order updates", note: "Pickup, wash and delivery status" },
  { id: "deliveryAlerts", label: "Delivery alerts", note: "When your rider is on the way" },
  { id: "promotions", label: "Offers & promotions", note: "Discounts and cashback deals" },
  { id: "email", label: "Email", note: "Invoices and receipts" },
  { id: "sms", label: "SMS", note: "Critical updates only" },
  { id: "push", label: "Push notifications", note: "On this device" },
];

/** Accessible on/off switch built from the design tokens. */
function Toggle({
  checked,
  disabled,
  onChange,
  label,
}: {
  checked: boolean;
  disabled?: boolean;
  onChange: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={onChange}
      className={`relative h-6 w-11 shrink-0 rounded-full transition-colors duration-300 disabled:opacity-50 ${
        checked ? "bg-brand-green" : "bg-muted"
      }`}
    >
      <span
        className={`absolute top-0.5 size-5 rounded-full bg-card shadow-soft transition-transform duration-300 ${
          checked ? "translate-x-[1.35rem]" : "translate-x-0.5"
        }`}
      />
    </button>
  );
}

export const Route = createFileRoute("/profile")({
  head: () => ({
    meta: [
      { title: "My Profile — QuickPress Account, Wallet & Membership" },
      {
        name: "description",
        content:
          "Manage your QuickPress account: edit profile, saved addresses, payment methods, wallet balance, Premium membership, orders and support — all in one place.",
      },
      { property: "og:title", content: "My Profile — QuickPress Account, Wallet & Membership" },
      {
        property: "og:description",
        content:
          "Edit your profile, manage addresses and payments, top up your QuickPress wallet and track your Premium membership.",
      },
    ],
  }),
  component: ProfileScreen,
});

type Row = {
  id: string;
  label: string;
  note?: string;
  icon: LucideIcon;
  tone?: "default" | "danger";
  action?: () => void;
  trailing?: "chevron" | "switch" | "soon";
};

function SectionHeading({ title, action }: { title: string; action?: string }) {
  return (
    <div className="flex items-end justify-between gap-3">
      <h2 className="text-[15px] font-bold tracking-tight text-foreground">{title}</h2>
      {action ? (
        <button
          type="button"
          className="text-xs font-bold text-brand-green transition-opacity active:opacity-60"
        >
          {action}
        </button>
      ) : null}
    </div>
  );
}

function RowList({ rows }: { rows: Row[] }) {
  return (
    <div className="card-soft mt-4 overflow-hidden border border-border">
      {rows.map((row, index) => (
        <button
          key={row.id}
          type="button"
          onClick={row.action}
          className={`ripple flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors duration-300 hover:bg-muted/70 active:bg-muted ${
            index > 0 ? "border-t border-border" : ""
          }`}
        >
          <span
            className={`flex size-10 shrink-0 items-center justify-center rounded-2xl bg-white shadow-xs border border-border/40 dark:bg-zinc-900 dark:border-zinc-800 ${
              row.tone === "danger"
                ? "text-destructive"
                : "text-brand-dark"
            }`}
          >
            <row.icon className="size-[1.1rem]" strokeWidth={2} />
          </span>
          <span className="min-w-0 flex-1">
            <span
              className={`block truncate text-sm font-bold ${
                row.tone === "danger" ? "text-destructive" : "text-foreground"
              }`}
            >
              {row.label}
            </span>
            {row.note ? (
              <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                {row.note}
              </span>
            ) : null}
          </span>
          {row.trailing === "soon" ? (
            <span className="shrink-0 rounded-full bg-muted px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.1em] text-muted-foreground">
              Soon
            </span>
          ) : (
            <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
          )}
        </button>
      ))}
    </div>
  );
}

function ProfileScreen() {
  useAuthGuard();
  const navigate = useNavigate();
  const [data, setData] = useState<ProfileData | null>(() => {
    try {
      if (typeof window !== "undefined") {
        const raw = localStorage.getItem("qp:cache:profile:screen");
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed?.data) return parsed.data;
        }
      }
    } catch {}
    return null;
  });
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(() => {
    try {
      if (typeof window !== "undefined") {
        const raw = localStorage.getItem("qp:cache:profile:screen");
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed?.data?.user) {
            const u = parsed.data.user;
            const cleanName = u.name && u.name !== "Customer" && u.name !== "Guest User" ? u.name : "";
            const rawDigits = (u.phone || "").replace("+91", "").replace(/\s+/g, "").replace(/\D/g, "");
            const cleanPhone = rawDigits.length >= 10 ? rawDigits.slice(-10) : "";
            return { name: cleanName, email: u.email || "", city: u.city || "", phone: cleanPhone };
          }
        }
      }
    } catch {}
    return { name: "", email: "", city: "", phone: "" };
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [retrying, setRetrying] = useState(false);
  const [offline, setOffline] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [notificationModalOpen, setNotificationModalOpen] = useState(false);
  const [appearanceModalOpen, setAppearanceModalOpen] = useState(false);
  const [languageModalOpen, setLanguageModalOpen] = useState(false);
  const [devicePermission, setDevicePermission] = useState<DevicePermissionStatus>("default");
  const [requestingDevicePerm, setRequestingDevicePerm] = useState(false);
  const [savedServicesOpen, setSavedServicesOpen] = useState(false);
  const [favouriteStoresOpen, setFavouriteStoresOpen] = useState(false);
  const [legalPrivacyModalOpen, setLegalPrivacyModalOpen] = useState(false);
  const photoInput = useRef<HTMLInputElement | null>(null);
  const settings = useAppSettings();
  const activeLocation = readSavedLocation();

  const isAnySubpageOpen =
    editing ||
    savedServicesOpen ||
    favouriteStoresOpen ||
    notificationModalOpen ||
    appearanceModalOpen ||
    languageModalOpen ||
    legalPrivacyModalOpen;

  const closeAllSubpages = useCallback(() => {
    setEditing(false);
    setSavedServicesOpen(false);
    setFavouriteStoresOpen(false);
    setNotificationModalOpen(false);
    setAppearanceModalOpen(false);
    setLanguageModalOpen(false);
    setLegalPrivacyModalOpen(false);
  }, []);

  // Sync subpage open/close with browser history so hardware/browser back returns to profile menu
  useEffect(() => {
    if (!isAnySubpageOpen) return;

    window.history.pushState({ qpProfileSubpage: true }, "");

    const handlePop = () => {
      closeAllSubpages();
    };

    window.addEventListener("popstate", handlePop);
    return () => {
      window.removeEventListener("popstate", handlePop);
    };
  }, [isAnySubpageOpen, closeAllSubpages]);

  useEffect(() => {
    setDevicePermission(getDeviceNotificationPermission());
  }, [notificationModalOpen]);

  const load = useCallback(async (forceRefresh = false) => {
    setLoadError(null);
    try {
      const next = await fetchProfileData({ forceRefresh });
      setData(next);
      const cleanName = next.user.name && next.user.name !== "Customer" && next.user.name !== "Guest User" ? next.user.name : "";
      const rawDigits = (next.user.phone || "").replace("+91", "").replace(/\s+/g, "").replace(/\D/g, "");
      const cleanPhone = rawDigits.length >= 10 ? rawDigits.slice(-10) : "";
      setForm({ name: cleanName, email: next.user.email, city: next.user.city, phone: cleanPhone });
    } catch {
      setLoadError(
        isOnline()
          ? "We couldn't load your profile."
          : "You're offline. Connect to load your profile.",
      );
    }
  }, []);

  useEffect(() => {
    // SWR: immediately use cache if available (instant 0ms paint, zero blink), then background sync
    void load(false);
  }, [load]);

  useEffect(() => {
    setOffline(!isOnline());
    return onNetworkChange((online) => {
      setOffline(!online);
      if (online) void load(true);
    });
  }, [load]);

  const retry = async () => {
    setRetrying(true);
    await load(true);
    setRetrying(false);
  };

  /** POST /api/profile/photo — read locally, upload as a data URL. */
  const handlePhotoFile = async (file: File | undefined) => {
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      toast.error("Choose a JPG or PNG image");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Photo must be 5 MB or smaller");
      return;
    }
    setUploading(true);
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(new Error("read-failed"));
        reader.readAsDataURL(file);
      });
      const avatarUrl = await updateProfilePhoto(dataUrl);
      setData((prev) => (prev ? { ...prev, user: { ...prev.user, avatarUrl } } : prev));
      toast.success("Profile photo updated");
    } catch {
      toast.error("Couldn't update your photo. Please try again.");
    } finally {
      setUploading(false);
      if (photoInput.current) photoInput.current.value = "";
    }
  };

  const soon = (label: string) => toast(`${label} — coming soon`);

  const themeLabel =
    THEME_OPTIONS.find((option) => option.id === settings.settings.theme)?.label ?? "System";
  const enabledNotifications = NOTIFICATION_ROWS.filter(
    (row) => settings.settings.notifications[row.id],
  ).length;

  const changeTheme = async (mode: ThemeMode) => {
    try {
      await settings.setTheme(mode);
      toast.success(`${THEME_OPTIONS.find((o) => o.id === mode)?.label} theme applied`);
    } catch {
      toast.error("Couldn't save your theme");
    }
  };

  const changeLanguage = async (code: string) => {
    try {
      await settings.setLanguage(code);
      switchAppLanguage(code);
      toast.success(code.startsWith("hi") ? "भाषा हिन्दी में सेट की गई" : "Language set to English");
    } catch {
      toast.error("Couldn't save language preference");
    }
  };

  const handleRequestDevicePermission = async () => {
    setRequestingDevicePerm(true);
    try {
      const res = await requestDeviceNotificationPermission();
      setDevicePermission(res);
      if (res === "granted") {
        toast.success("Device notification permission allowed! 🎉");
        sendTestNotification();
      } else if (res === "denied") {
        const opened = await openDeviceNotificationSettings();
        if (opened) {
          toast.info("Opening app settings... Please turn ON 'Allow Notifications'.");
        } else {
          toast.error("Notification permission denied. Please allow notifications in device/browser settings.");
        }
      }
    } catch {
      toast.error("Failed to request permission.");
    } finally {
      setRequestingDevicePerm(false);
    }
  };


  const toggleNotification = async (key: keyof NotificationPreferences) => {
    try {
      await settings.toggleNotification(key);
      toast.success("Notification preference updated");
    } catch {
      toast.error("Couldn't save that preference");
    }
  };

  const handleSave = async () => {
    if (!data) return;
    const errors = validateProfile(form);
    setFormErrors(errors as Record<string, string>);
    if (Object.keys(errors).length > 0) return;
    setSaving(true);
    try {
      const payloadCity = activeLocation?.city || form.city || "Kasganj";
      const cleanDigits = (form.phone || "").replace(/\D/g, "");
      const payloadPhone = cleanDigits.length === 10 ? `+91${cleanDigits}` : undefined;
      const saved = await updateProfile({
        name: form.name,
        email: form.email,
        city: payloadCity,
        phone: payloadPhone,
      });
      const updatedPhone = saved.phone || (payloadPhone ? (payloadPhone.startsWith("+") ? payloadPhone : `+91 ${payloadPhone.slice(-10)}`) : data.user.phone);
      setData({
        ...data,
        user: {
          ...data.user,
          name: saved.name || data.user.name,
          email: saved.email || data.user.email,
          city: saved.city || data.user.city,
          phone: updatedPhone,
        },
      });
      setEditing(false);
      toast.success("Profile updated");
    } catch (err: any) {
      const rawMsg = String(err?.message || "");
      if (
        rawMsg.toLowerCase().includes("already registered") ||
        rawMsg.toLowerCase().includes("already linked") ||
        rawMsg.toLowerCase().includes("already")
      ) {
        setFormErrors((prev) => ({
          ...prev,
          phone: "Number already linked to another account",
        }));
        toast.error("Yeh mobile number pehle se doosre account se linked hai (Number already registered).", {
          duration: 4000,
        });
      } else {
        toast.error(
          rawMsg || (isOnline() ? "Couldn't save your profile" : "You're offline — changes not saved"),
        );
      }
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    setLoggingOut(true);
    await logout();
    setLoggingOut(false);
    setLogoutOpen(false);
    toast.success("You've been logged out");
    navigate({ to: "/home" });
  };

  const handleDeleteAccount = async () => {
    setDeleting(true);
    try {
      await deleteCustomerAccount();
      setDeleting(false);
      setDeleteOpen(false);
      toast.success("Your QuickPress account has been permanently deleted.");
      navigate({ to: "/login" });
    } catch {
      setDeleting(false);
      toast.error("Couldn't delete your account. Please try again.");
    }
  };

  const handleSubpageBack = useCallback(() => {
    if (typeof window !== "undefined" && window.history.state?.qpProfileSubpage) {
      window.history.back();
    } else {
      closeAllSubpages();
    }
  }, [closeAllSubpages]);

  if (editing && data) {
    return (
      <main className="relative min-h-screen overflow-x-hidden bg-white dark:bg-zinc-950">
        <div className="relative mx-auto w-full max-w-md pb-32">
          {/* Hidden file input for photo upload */}
          <input
            ref={photoInput}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={(e) => void handlePhotoFile(e.target.files?.[0])}
          />

          {/* Top app bar with back navigation */}
          <header className="sticky top-0 z-30 flex items-center justify-between px-4 py-3.5 bg-white/85 dark:bg-zinc-950/85 backdrop-blur-md rounded-b-2xl sm:rounded-b-3xl border-none shadow-[0_3px_12px_-2px_rgba(0,0,0,0.06)] dark:shadow-[0_3px_12px_-2px_rgba(0,0,0,0.35)]">
            <div className="flex items-center gap-3">
              <button
                type="button"
                aria-label="Back to profile"
                onClick={handleSubpageBack}
                className="flex size-10 items-center justify-center rounded-full bg-muted text-foreground transition-transform active:scale-95 hover:bg-accent"
              >
                <ArrowLeft className="size-5" />
              </button>
              <div>
                <h1 className="text-base font-black tracking-tight text-foreground">
                  Personal Information
                </h1>
                <p className="text-[11px] font-medium text-muted-foreground">
                  Edit your profile details
                </p>
              </div>
            </div>
          </header>

          {/* Page Content */}
          <div className="px-5 pt-5 space-y-4">
            {/* Profile Photo Card */}
            <div className="card-soft flex items-center gap-4 p-4 border border-border">
              <div className="relative size-16 shrink-0">
                <img
                  src={data.user.avatarUrl || defaultAvatar}
                  alt={data.user.name}
                  className="size-16 rounded-2xl object-cover border-2 border-primary/20 bg-muted"
                />
                <button
                  type="button"
                  disabled={uploading}
                  onClick={() => photoInput.current?.click()}
                  className="absolute -bottom-1 -right-1 flex size-6 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-md transition-transform hover:scale-105 active:scale-95 disabled:opacity-60"
                  title="Change photo"
                >
                  {uploading ? (
                    <Loader2 className="size-3 animate-spin" />
                  ) : (
                    <Camera className="size-3" />
                  )}
                </button>
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-foreground">Profile Picture</p>
                <p className="text-[10px] text-muted-foreground">JPG, PNG or WebP, up to 5 MB</p>
                <button
                  type="button"
                  disabled={uploading}
                  onClick={() => photoInput.current?.click()}
                  className="mt-1 inline-flex items-center gap-1 text-[11px] font-bold text-primary hover:underline"
                >
                  {uploading ? "Uploading..." : "Change Photo"}
                </button>
              </div>
            </div>

            {/* Form Fields Card */}
            <div className="card-soft space-y-3.5 p-4.5 border border-border">
              {/* Full Name */}
              <div>
                <label className="block text-[11px] font-bold text-foreground mb-1">
                  Full Name <span className="text-destructive">*</span>
                </label>
                <div className="relative flex items-center">
                  <span className="pointer-events-none absolute left-3.5 text-muted-foreground">
                    <User className="size-4" />
                  </span>
                  <input
                    value={form.name}
                    aria-invalid={Boolean(formErrors['name'])}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, name: event.target.value }))
                    }
                    placeholder="Enter your full name"
                    className={`h-11 w-full rounded-xl border bg-background pl-10 pr-3.5 text-xs font-semibold text-foreground outline-none transition-all placeholder:text-muted-foreground/60 focus:border-primary focus:ring-2 focus:ring-primary/20 ${
                      formErrors['name']
                        ? "border-destructive focus:border-destructive focus:ring-destructive/20"
                        : "border-border"
                    }`}
                  />
                </div>
                {formErrors['name'] ? (
                  <span className="mt-1 block text-[10px] font-semibold text-destructive">
                    {formErrors['name']}
                  </span>
                ) : null}
              </div>

              {/* Email Address */}
              <div>
                <label className="block text-[11px] font-bold text-foreground mb-1">
                  Email Address
                </label>
                <div className="relative flex items-center">
                  <span className="pointer-events-none absolute left-3.5 text-muted-foreground">
                    <Mail className="size-4" />
                  </span>
                  <input
                    type="email"
                    value={form.email}
                    aria-invalid={Boolean(formErrors['email'])}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, email: event.target.value }))
                    }
                    placeholder="name@example.com"
                    className={`h-11 w-full rounded-xl border bg-background pl-10 pr-3.5 text-xs font-semibold text-foreground outline-none transition-all placeholder:text-muted-foreground/60 focus:border-primary focus:ring-2 focus:ring-primary/20 ${
                      formErrors['email']
                        ? "border-destructive focus:border-destructive focus:ring-destructive/20"
                        : "border-border"
                    }`}
                  />
                </div>
                {formErrors['email'] ? (
                  <span className="mt-1 block text-[10px] font-semibold text-destructive">
                    {formErrors['email']}
                  </span>
                ) : null}
              </div>

              {/* Mobile Number — Locked & Verified if logged in with phone, editable if not linked */}
              <div>
                {Boolean(data.user.phone && data.user.phone.trim() && data.user.phone !== "Not linked") ? (
                  <>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-[11px] font-bold text-foreground">
                        Mobile Number
                      </label>
                      <span className="inline-flex items-center gap-1 rounded-md bg-secondary/15 px-2 py-0.5 text-[10px] font-bold text-brand-green">
                        <BadgeCheck className="size-3" /> Verified
                      </span>
                    </div>
                    <div className="flex h-11 items-center justify-between rounded-xl border border-border/80 bg-muted/30 px-3.5 text-xs text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <Phone className="size-3.5 text-muted-foreground/70" />
                        <span className="font-semibold text-foreground">
                          {data.user.phone}
                        </span>
                      </div>
                    </div>
                    <p className="mt-1 text-[10px] text-muted-foreground">
                      Primary mobile number linked to your QuickPress login.
                    </p>
                  </>
                ) : (
                  <>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-[11px] font-bold text-foreground">
                        Mobile Number
                      </label>
                      <span className="rounded-md bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold text-amber-600 dark:text-amber-400">
                        Not Linked
                      </span>
                    </div>
                    <div className="relative flex items-center">
                      <span className="pointer-events-none absolute left-3.5 flex items-center gap-1.5 text-xs font-bold text-muted-foreground">
                        <Phone className="size-3.5 text-muted-foreground/80" />
                        <span>+91</span>
                        <span className="text-border">|</span>
                      </span>
                      <input
                        type="tel"
                        inputMode="numeric"
                        maxLength={10}
                        value={form.phone}
                        aria-invalid={Boolean(formErrors['phone'])}
                        onChange={(event) => {
                          const digits = event.target.value.replace(/\D/g, "").slice(0, 10);
                          setForm((prev) => ({ ...prev, phone: digits }));
                          if (formErrors['phone']) {
                            setFormErrors((prev) => ({ ...prev, phone: "" }));
                          }
                        }}
                        placeholder="Enter 10-digit mobile number"
                        className={`h-11 w-full rounded-xl border bg-background pl-18 pr-3.5 text-xs font-semibold text-foreground outline-none transition-all placeholder:text-muted-foreground/60 focus:border-primary focus:ring-2 focus:ring-primary/20 ${
                          formErrors['phone']
                            ? "border-destructive focus:border-destructive focus:ring-destructive/20"
                            : "border-border"
                        }`}
                      />
                    </div>
                    {formErrors['phone'] ? (
                      <span className="mt-1 block text-[10px] font-semibold text-destructive">
                        {formErrors['phone']}
                      </span>
                    ) : (
                      <p className="mt-1 text-[10px] text-muted-foreground">
                        Enter your 10-digit mobile number for order delivery updates & Captain contact.
                      </p>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Current Service Area Card */}
            <div className="card-soft p-4 border border-border">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-2.5 min-w-0">
                  <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-xl bg-secondary/15 text-brand-green">
                    <MapPin className="size-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      Current Service Area
                    </p>
                    <p className="truncate text-xs font-bold text-foreground mt-0.5">
                      {activeLocation?.area || activeLocation?.city || data.user.city || "Kasganj"}
                    </p>
                    <p className="truncate text-[10px] text-muted-foreground">
                      {[activeLocation?.city, activeLocation?.state].filter(Boolean).join(", ") ||
                        "Uttar Pradesh, India"}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setEditing(false);
                    void navigate({ to: "/location-search" });
                  }}
                  className="shrink-0 rounded-lg border border-border bg-card px-2.5 py-1 text-[10px] font-bold text-foreground shadow-2xs hover:bg-muted active:scale-95"
                >
                  Change
                </button>
              </div>
            </div>

            {/* Save Changes & Cancel Buttons */}
            <div className="pt-2 space-y-2.5">
              <button
                type="button"
                disabled={saving || !form.name.trim()}
                onClick={handleSave}
                className="ripple flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-primary text-xs font-bold text-primary-foreground shadow-cta transition-all duration-300 hover:brightness-105 active:scale-[0.98] disabled:opacity-50"
              >
                {saving ? <Loader2 className="size-3.5 animate-spin" /> : null}
                <span>{saving ? "Saving Changes..." : "Save Changes"}</span>
              </button>

              <button
                type="button"
                onClick={handleSubpageBack}
                className="flex h-11 w-full items-center justify-center rounded-2xl border border-border bg-card text-xs font-bold text-foreground transition-all hover:bg-muted active:scale-[0.98]"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </main>
    );
  }

  if (savedServicesOpen) {
    return <SavedServicesPage onBack={handleSubpageBack} />;
  }

  if (favouriteStoresOpen) {
    return <FavouriteStoresPage onBack={handleSubpageBack} />;
  }

  if (notificationModalOpen) {
    return (
      <NotificationSettingsPage
        onBack={handleSubpageBack}
        devicePermission={devicePermission}
        requestingDevicePerm={requestingDevicePerm}
        onRequestDevicePermission={handleRequestDevicePermission}
        onSendTestNotification={() => {
          const sent = sendTestNotification();
          if (sent) toast.success("Test notification sent to your phone/screen!");
          else toast.info("Notification triggered!");
        }}
        notificationRows={NOTIFICATION_ROWS}
        notifications={settings.settings.notifications}
        saving={settings.saving}
        onToggleNotification={toggleNotification}
      />
    );
  }

  if (appearanceModalOpen) {
    return (
      <AppearanceSettingsPage
        onBack={handleSubpageBack}
        currentTheme={settings.settings.theme}
        saving={settings.saving}
        onChangeTheme={changeTheme}
      />
    );
  }

  if (languageModalOpen) {
    return (
      <LanguageSettingsPage
        onBack={handleSubpageBack}
        currentLanguage={settings.settings.language}
        saving={settings.saving}
        onChangeLanguage={changeLanguage}
      />
    );
  }

  if (legalPrivacyModalOpen) {
    return (
      <LegalPrivacyPage
        onBack={handleSubpageBack}
        onRequestDelete={() => {
          setLegalPrivacyModalOpen(false);
          setDeleteOpen(true);
        }}
      />
    );
  }

  return (
    <main className="relative min-h-screen overflow-x-hidden bg-white dark:bg-zinc-950">
      <div className="relative mx-auto w-full max-w-md">
        {/* Top app bar */}
        <header className="sticky top-0 z-30 flex items-center justify-between gap-3 px-5 py-3.5 bg-white/85 dark:bg-zinc-950/85 backdrop-blur-md rounded-b-2xl sm:rounded-b-3xl border-none shadow-[0_3px_12px_-2px_rgba(0,0,0,0.06)] dark:shadow-[0_3px_12px_-2px_rgba(0,0,0,0.35)]">
          <h1 className="text-lg font-bold tracking-tight text-foreground">My Profile</h1>
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              aria-label="Notifications"
              onClick={() => navigate({ to: "/notifications" })}
              className="relative flex size-10 items-center justify-center rounded-full bg-white text-foreground shadow-xs border border-border/50 transition-all duration-300 hover:bg-accent active:scale-[0.94] dark:bg-zinc-900 dark:border-zinc-800"
            >
              <Bell className="size-5" />
              {data && data.user.unreadNotifications > 0 ? (
                <span className="absolute -right-0.5 -top-0.5 flex size-4 items-center justify-center rounded-full bg-secondary text-[9px] font-bold text-secondary-foreground">
                  {data.user.unreadNotifications}
                </span>
              ) : null}
            </button>
            <button
              type="button"
              aria-label="Appearance"
              onClick={() => setAppearanceModalOpen(true)}
              className="flex size-10 items-center justify-center rounded-full bg-white text-foreground shadow-xs border border-border/50 transition-all duration-300 hover:bg-accent active:scale-[0.94] dark:bg-zinc-900 dark:border-zinc-800"
            >
              <Settings className="size-5" />
            </button>
          </div>
        </header>

        {offline ? (
          <div className="mx-5 mt-4 flex items-center gap-2 rounded-2xl border border-border bg-muted/70 px-4 py-2.5 text-xs font-semibold text-muted-foreground">
            <WifiOff className="size-4 shrink-0" />
            You're offline — showing your last saved profile.
          </div>
        ) : null}

        {!data && loadError ? (
          <div className="px-5 py-16 text-center">
            <span className="mx-auto flex size-14 items-center justify-center rounded-3xl bg-destructive/10 text-destructive">
              <ShieldAlert className="size-6" />
            </span>
            <h2 className="mt-4 text-base font-bold tracking-tight text-foreground">
              {loadError}
            </h2>
            <p className="mt-1.5 text-xs text-muted-foreground">
              Check your connection and try again.
            </p>
            <button
              type="button"
              onClick={retry}
              disabled={retrying}
              className="ripple mx-auto mt-5 flex h-11 items-center justify-center gap-2 rounded-3xl bg-primary px-6 text-sm font-bold text-primary-foreground shadow-cta transition-all duration-300 active:scale-[0.97] disabled:opacity-60"
            >
              {retrying ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <RefreshCw className="size-4" />
              )}
              Try again
            </button>
          </div>
        ) : null}

        {!data && !loadError ? (
          <>
            <ProfileSkeleton />
          </>
        ) : null}

        {data ? (
          <div className="px-5 pb-32 pt-5">
            {/* Profile header — GET /api/profile */}
            <section className="card-soft relative overflow-hidden border border-border bg-gradient-to-br from-primary/25 via-card to-secondary/15 p-5">
              <div className="pointer-events-none absolute -right-10 -top-12 size-40 rounded-full bg-primary/25 blur-2xl" />
              <div className="relative flex items-start gap-4">
                <div className="relative shrink-0">
                  <img
                    src={data.user.avatarUrl || defaultAvatar}
                    alt={`${data.user.name}'s profile photo`}
                    className="size-20 rounded-full object-cover shadow-soft border-2 border-white/80 dark:border-zinc-800 bg-white"
                  />
                  <button
                    type="button"
                    aria-label="Upload profile photo"
                    disabled={uploading}
                    onClick={() => photoInput.current?.click()}
                    className="absolute -bottom-1 -right-1 flex size-8 items-center justify-center rounded-full border-2 border-card bg-primary text-primary-foreground shadow-soft transition-transform duration-300 active:scale-[0.9]"
                  >
                    {uploading ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Camera className="size-4" />
                    )}
                  </button>
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <p className="truncate text-lg font-bold leading-tight tracking-tight text-foreground">
                      {data.user.name && data.user.name !== "Customer" && data.user.name !== "Guest User"
                        ? data.user.name
                        : (data.user.phone || "QuickPress User")}
                    </p>
                    {data.user.verified ? (
                      <BadgeCheck className="size-[1.05rem] shrink-0 text-brand-green" />
                    ) : null}
                  </div>
                  {data.user.phone && data.user.phone !== "Not linked" ? (
                    <p className="mt-1.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Phone className="size-3.5 shrink-0" />
                      <span className="truncate">{data.user.phone}</span>
                    </p>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setEditing(true)}
                      className="mt-1.5 flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
                    >
                      <Phone className="size-3.5 shrink-0" />
                      <span>+ Add mobile number</span>
                    </button>
                  )}
                  <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Mail className="size-3.5 shrink-0" />
                    <span className="truncate">{data.user.email}</span>
                  </p>
                  <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                    <MapPin className="size-3.5 shrink-0 text-primary" />
                    <span className="truncate">
                      {activeLocation?.area
                        ? `${activeLocation.area}, ${activeLocation.city || ""}`
                        : (activeLocation?.city || data.user.city || "Kasganj, Uttar Pradesh")}
                    </span>
                  </p>
                  <p className="mt-1 flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground">
                    <Clock className="size-3.5 shrink-0" />
                    Member since {data.user.memberSince}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setEditing(true)}
                className="ripple mt-4 flex h-11 w-full items-center justify-center gap-2 rounded-3xl bg-primary text-sm font-bold text-primary-foreground shadow-cta transition-all duration-300 hover:brightness-[1.03] active:scale-[0.97]"
              >
                <Pencil className="size-4" />
                Edit Profile
              </button>
            </section>

            {/* Quick stats */}
            <section className="mt-4 grid grid-cols-2 gap-3">
              {[
                {
                  id: "orders",
                  label: "Total Orders",
                  value: String(data.stats?.totalOrders ?? 0),
                  icon: Package,
                  action: () => navigate({ to: "/history" }),
                },
                {
                  id: "points",
                  label: "Loyalty Points",
                  value: (data.stats?.rewardPoints ?? 0).toLocaleString("en-IN"),
                  icon: Star,
                  action: () => navigate({ to: "/referral" }),
                },
                {
                  id: "wallet",
                  label: "Wallet Balance",
                  value: `₹${(data.stats?.walletBalance ?? 0).toLocaleString("en-IN")}`,
                  icon: Wallet,
                  action: () => navigate({ to: "/wallet" }),
                },
                {
                  id: "addresses",
                  label: "Saved Addresses",
                  value: String(data.stats?.savedAddresses ?? 0),
                  icon: MapPin,
                  action: () => navigate({ to: "/addresses" }),
                },
              ].map((stat, index) => (
                <button
                  key={stat.id}
                  type="button"
                  onClick={stat.action} className="card-soft ripple flex flex-col items-start gap-3 border border-border p-4 text-left transition-all duration-300 hover:border-primary/60 active:scale-[0.96]"
                >
                  <span className="flex size-10 items-center justify-center rounded-2xl bg-white text-brand-green shadow-xs border border-border/40 dark:bg-zinc-900 dark:border-zinc-800">
                    <stat.icon className="size-5" />
                  </span>
                  <span>
                    <span className="animate-pop block text-lg font-bold leading-tight text-foreground">
                      {stat.value}
                    </span>
                    <span className="mt-0.5 block text-[11px] font-semibold text-muted-foreground">
                      {stat.label}
                    </span>
                  </span>
                </button>
              ))}
            </section>

            {/* Account — GET /api/addresses, GET /api/payment-methods, GET /api/orders, GET /api/wallet */}
            <section className="mt-8">
              <SectionHeading title="Account" />
              <RowList
                rows={[
                  {
                    id: "referral",
                    label: "Refer & Earn (Loyalty Points)",
                    note: "Share code, earn 50 Loyalty Points per friend",
                    icon: Gift,
                    action: () => navigate({ to: "/referral" }),
                  },
                  {
                    id: "wallet",
                    label: "QuickPress Wallet & Funds",
                    note: `₹${(data.stats?.walletBalance ?? 0).toLocaleString("en-IN")} · Add money & instant cashbacks`,
                    icon: Wallet,
                    action: () => navigate({ to: "/wallet" }),
                  },
                  {
                    id: "personal",
                    label: "Personal Information",
                    note: "Name, phone, email",
                    icon: User,
                    action: () => setEditing(true),
                  },
                  {
                    id: "addresses",
                    label: "Manage Addresses",
                    note: `${data.stats.savedAddresses} saved addresses`,
                    icon: MapPin,
                    action: () => navigate({ to: "/addresses" }),
                  },
                  {
                    id: "payments",
                    label: "Payment Methods",
                    note: "UPI, cards & netbanking",
                    icon: CreditCard,
                    action: () => navigate({ to: "/payment-methods" }),
                  },
                  {
                    id: "orders",
                    label: "My Orders",
                    note: `${data.stats.totalOrders} total orders · live & history`,
                    icon: Package,
                    action: () => navigate({ to: "/history" }),
                  },
                  {
                    id: "invoices",
                    label: "Invoices",
                    note: "GST bills & receipts",
                    icon: Receipt,
                    action: () => navigate({ to: "/invoices" }),
                  },
                  {
                    id: "services",
                    label: "Saved Services",
                    note: "Your favourite & bookmarked services",
                    icon: Heart,
                    action: () => setSavedServicesOpen(true),
                  },
                  {
                    id: "stores",
                    label: "Favourite Laundry Stores",
                    note: "Partners you love ordering from",
                    icon: Sparkles,
                    action: () => setFavouriteStoresOpen(true),
                  },
                ]}
              />
            </section>

            {/* Support */}
            <section className="mt-8">
              <SectionHeading title="Support" />
              <RowList
                rows={[
                  {
                    id: "help",
                    label: "Help Center",
                    note: "Guides & quick answers",
                    icon: LifeBuoy,
                    action: () => navigate({ to: "/help" }),
                  },
                  {
                    id: "chat",
                    label: "Live Chat",
                    note: "Average reply in 2 min",
                    icon: MessageCircle,
                    action: () => navigate({ to: "/help" }),
                  },
                  {
                    id: "call",
                    label: "Call Support",
                    note: "1800 123 4567 · 24×7",
                    icon: Headphones,
                    action: () => navigate({ to: "/help" }),
                  },
                  {
                    id: "faq",
                    label: "FAQ",
                    note: "Pickups, pricing & refunds",
                    icon: HelpCircle,
                    action: () => navigate({ to: "/help" }),
                  },
                  {
                    id: "report",
                    label: "Report an Issue",
                    note: "Damaged, missing or delayed",
                    icon: ShieldAlert,
                    action: () => soon("Report an issue"),
                  },
                ]}
              />
            </section>

            {/* Account settings */}
            <section className="mt-8">
              <SectionHeading title="Account Settings" />
              <RowList
                rows={[
                  {
                    id: "notifications",
                    label: "Notifications",
                    note: `${enabledNotifications} of ${NOTIFICATION_ROWS.length} alerts on`,
                    icon: Bell,
                    action: () => setNotificationModalOpen(true),
                  },
                  {
                    id: "appearance",
                    label: "Appearance",
                    note: `${themeLabel} theme`,
                    icon: Moon,
                    action: () => setAppearanceModalOpen(true),
                  },
                  {
                    id: "language",
                    label: "Language",
                    note: settings.settings.language === "en-IN" ? "English (India)" : "हिन्दी (Hindi)",
                    icon: Globe,
                    action: () => setLanguageModalOpen(true),
                  },
                  {
                    id: "legal_privacy",
                    label: "Legal & Privacy",
                    note: "Privacy Policy, Terms & Data Rights",
                    icon: ShieldCheck,
                    action: () => setLegalPrivacyModalOpen(true),
                  },
                  {
                    id: "delete",
                    label: "Delete Account",
                    note: "Permanently remove your data",
                    icon: Trash2,
                    tone: "danger",
                    action: () => setDeleteOpen(true),
                  },
                ]}
              />
            </section>


            {/* Logout — POST /api/logout */}
            <button
              type="button"
              onClick={() => setLogoutOpen(true)}
              className="ripple mt-8 flex h-14 w-full items-center justify-center gap-2 rounded-3xl border-2 border-destructive/50 bg-destructive/5 text-sm font-bold text-destructive transition-all duration-300 hover:bg-destructive/10 active:scale-[0.97]"
            >
              <LogOut className="size-4" />
              Logout
            </button>
          </div>
        ) : null}
      </div>



      {/* Logout confirmation sheet */}
      {logoutOpen ? (
        <div className="fixed inset-0 z-[999] flex items-start justify-center p-4 pt-12 sm:pt-16 overflow-y-auto">
          <div
            onClick={() => setLogoutOpen(false)}
            className="fixed inset-0 bg-black/65 backdrop-blur-sm transition-opacity"
            aria-hidden="true"
          />
          <div className="relative w-full max-w-sm rounded-3xl bg-card p-6 shadow-2xl border border-border z-10">
            <div className="flex flex-col items-center text-center">
              <span className="flex size-14 items-center justify-center rounded-3xl bg-destructive/10 text-destructive">
                <LogOut className="size-6" />
              </span>
              <h2 className="mt-3 text-base font-bold tracking-tight text-foreground">
                Logout of QuickPress?
              </h2>
              <p className="mt-1.5 text-xs text-muted-foreground">
                You'll need to sign in again to book pickups and track your orders.
              </p>
            </div>
            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={() => setLogoutOpen(false)}
                className="ripple h-11 flex-1 rounded-xl border border-border bg-card text-xs font-bold text-foreground hover:bg-muted active:scale-[0.97]"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={loggingOut}
                onClick={handleLogout}
                className="ripple flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-destructive text-xs font-bold text-destructive-foreground hover:brightness-105 active:scale-[0.97] disabled:opacity-60"
              >
                {loggingOut ? <Loader2 className="size-4 animate-spin" /> : null}
                Logout
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* Delete Account confirmation sheet */}
      {deleteOpen ? (
        <div className="fixed inset-0 z-[999] flex items-start justify-center p-4 pt-12 sm:pt-16 overflow-y-auto">
          <div
            onClick={() => setDeleteOpen(false)}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm transition-opacity"
            aria-hidden="true"
          />
          <div className="relative w-full max-w-sm rounded-3xl bg-card p-6 shadow-2xl border border-destructive/30 z-10 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex flex-col items-center text-center">
              <span className="flex size-14 items-center justify-center rounded-3xl bg-destructive/15 text-destructive ring-8 ring-destructive/10">
                <Trash2 className="size-6" />
              </span>
              <h2 className="mt-4 text-base font-black tracking-tight text-foreground">
                Delete QuickPress Account?
              </h2>
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                This action is <span className="font-bold text-destructive">permanent and irreversible</span>. All your saved addresses, payment methods, profile details, active orders, and wallet balance will be deleted immediately.
              </p>
              <div className="mt-3 p-2.5 rounded-xl bg-muted/60 border border-border text-[11px] text-muted-foreground text-left leading-relaxed">
                ⚖️ <strong>Statutory Notice:</strong> Deleting your account may not immediately remove information that QuickPress is required or permitted to retain for legal, security, transaction, fraud-prevention or dispute-resolution purposes.
              </div>
              <Link
                to="/legal/$docSlug"
                params={{ docSlug: "privacy-policy" }}
                className="mt-2 text-[11px] font-bold text-primary underline block"
              >
                Read Privacy Policy →
              </Link>
            </div>
            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={() => setDeleteOpen(false)}
                disabled={deleting}
                className="ripple h-11 flex-1 rounded-xl border border-border bg-card text-xs font-bold text-foreground hover:bg-muted active:scale-[0.97] disabled:opacity-50"
              >
                Keep Account
              </button>
              <button
                type="button"
                disabled={deleting}
                onClick={handleDeleteAccount}
                className="ripple flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-destructive text-xs font-black text-destructive-foreground hover:brightness-105 active:scale-[0.97] disabled:opacity-60 shadow-md"
              >
                {deleting ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-3.5" />}
                {deleting ? "Deleting..." : "Delete Account"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* Hidden picker used by both photo buttons — POST /api/profile/photo */}
      <input
        ref={photoInput}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="hidden"
        onChange={(event) => void handlePhotoFile(event.target.files?.[0])}
      />

      {logoutOpen || deleteOpen ? null : <BottomNav active="profile" />}
    </main>
  );
}

/* ==========================================================================
   FULL PAGE: Saved Services
   ========================================================================== */
function SavedServicesPage({ onBack }: { onBack: () => void }) {
  const navigate = useNavigate();
  const [services, setServices] = useState<SavedServiceItem[]>(() => {
    try {
      const raw = typeof window !== "undefined" ? localStorage.getItem("qp:cache:saved:services") : null;
      if (raw) return JSON.parse(raw);
    } catch {}
    return [];
  });
  const [loading, setLoading] = useState(() => {
    try {
      return typeof window !== "undefined" ? !localStorage.getItem("qp:cache:saved:services") : true;
    } catch {
      return true;
    }
  });

  const load = useCallback(() => {
    fetchSavedServices()
      .then((res) => {
        setServices(res);
        try {
          localStorage.setItem("qp:cache:saved:services", JSON.stringify(res));
        } catch {}
      })
      .catch(() => setServices([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleRemove = async (serviceId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await removeSavedService(serviceId);
      setServices((prev) => {
        const next = prev.filter((s) => s.serviceId !== serviceId && s.id !== serviceId);
        try {
          localStorage.setItem("qp:cache:saved:services", JSON.stringify(next));
        } catch {}
        return next;
      });
      toast.success("Service removed from saved list");
    } catch {
      toast.error("Failed to remove service");
    }
  };

  return (
    <main className="relative min-h-screen overflow-x-hidden bg-white dark:bg-zinc-950">
      <div className="relative mx-auto w-full max-w-md pb-32">
        {/* Top App Bar */}
        <header className="sticky top-0 z-30 flex items-center justify-between px-4 py-3.5 bg-white/85 dark:bg-zinc-950/85 backdrop-blur-md rounded-b-2xl sm:rounded-b-3xl border-none shadow-[0_3px_12px_-2px_rgba(0,0,0,0.06)] dark:shadow-[0_3px_12px_-2px_rgba(0,0,0,0.35)]">
          <div className="flex items-center gap-3">
            <button
              type="button"
              aria-label="Back to profile"
              onClick={onBack}
              className="flex size-10 items-center justify-center rounded-full bg-muted text-foreground transition-transform active:scale-95 hover:bg-accent"
            >
              <ArrowLeft className="size-5" />
            </button>
            <div>
              <h1 className="text-base font-black tracking-tight text-foreground">
                Saved Services
              </h1>
              <p className="text-[11px] font-medium text-muted-foreground">
                Your bookmarked laundry services
              </p>
            </div>
          </div>
          {services.length > 0 ? (
            <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-black text-primary">
              {services.length}
            </span>
          ) : null}
        </header>

        {/* Content */}
        <div className="px-5 pt-5 space-y-3">
          {loading ? (
            <div className="py-20 text-center">
              <Loader2 className="mx-auto size-7 animate-spin text-primary" />
              <p className="mt-3 text-xs font-semibold text-muted-foreground">Loading your saved services…</p>
            </div>
          ) : services.length === 0 ? (
            <div className="card-soft py-16 px-6 text-center border border-border mt-4">
              <div className="mx-auto flex size-16 items-center justify-center rounded-3xl bg-destructive/10 text-destructive mb-4 shadow-xs">
                <Heart className="size-8 fill-destructive/20" />
              </div>
              <h3 className="text-base font-bold text-foreground">No saved services yet</h3>
              <p className="mt-1.5 text-xs text-muted-foreground max-w-xs mx-auto leading-relaxed">
                Bookmark your frequent laundry and dry cleaning services to quickly book them anytime with 1 tap.
              </p>
              <button
                type="button"
                onClick={() => {
                  onBack();
                  void navigate({ to: "/home" });
                }}
                className="mt-6 inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-primary px-6 text-xs font-bold text-primary-foreground shadow-cta hover:brightness-105 active:scale-95 transition-all"
              >
                <Sparkles className="size-4" />
                <span>Browse All Services</span>
              </button>
            </div>
          ) : (
            services.map((item) => (
              <div
                key={item.id}
                onClick={() => {
                  onBack();
                  void navigate({ to: "/services/$serviceId", params: { serviceId: item.serviceId } });
                }}
                className="card-soft group relative flex items-center gap-3.5 p-4 border border-border hover:border-primary/50 cursor-pointer active:scale-[0.99] transition-all"
              >
                <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary shadow-xs">
                  <Sparkles className="size-6 text-brand-dark" />
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="truncate text-sm font-bold text-foreground">{item.title || item.name}</h4>
                  <div className="mt-1 flex items-center gap-2">
                    <span className="text-xs font-extrabold text-brand-green">₹{item.finalPrice || item.price}</span>
                    <span className="text-[11px] text-muted-foreground">· {item.processingTime || "24 hrs delivery"}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    aria-label="Remove from saved"
                    onClick={(e) => handleRemove(item.serviceId, e)}
                    className="flex size-9 items-center justify-center rounded-xl text-muted-foreground hover:bg-destructive/10 hover:text-destructive active:scale-90 transition-all"
                  >
                    <Trash2 className="size-4" />
                  </button>
                  <span className="flex size-8 items-center justify-center rounded-xl bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                    <ArrowRight className="size-4" />
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </main>
  );
}

/* ==========================================================================
   FULL PAGE: Favourite Stores
   ========================================================================== */
function FavouriteStoresPage({ onBack }: { onBack: () => void }) {
  const navigate = useNavigate();
  const [stores, setStores] = useState<FavouritePartnerItem[]>(() => {
    try {
      const raw = typeof window !== "undefined" ? localStorage.getItem("qp:cache:fav:stores") : null;
      if (raw) return JSON.parse(raw);
    } catch {}
    return [];
  });
  const [loading, setLoading] = useState(() => {
    try {
      return typeof window !== "undefined" ? !localStorage.getItem("qp:cache:fav:stores") : true;
    } catch {
      return true;
    }
  });

  const load = useCallback(() => {
    fetchFavouritePartners()
      .then((res) => {
        setStores(res);
        try {
          localStorage.setItem("qp:cache:fav:stores", JSON.stringify(res));
        } catch {}
      })
      .catch(() => setStores([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleRemove = async (partnerId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await removeFavouritePartner(partnerId);
      setStores((prev) => {
        const next = prev.filter((s) => s.partnerId !== partnerId && s.id !== partnerId);
        try {
          localStorage.setItem("qp:cache:fav:stores", JSON.stringify(next));
        } catch {}
        return next;
      });
      toast.success("Store removed from favourites");
    } catch {
      toast.error("Failed to remove store");
    }
  };

  return (
    <main className="relative min-h-screen overflow-x-hidden bg-white dark:bg-zinc-950">
      <div className="relative mx-auto w-full max-w-md pb-32">
        {/* Top App Bar */}
        <header className="sticky top-0 z-30 flex items-center justify-between px-4 py-3.5 bg-white/85 dark:bg-zinc-950/85 backdrop-blur-md rounded-b-2xl sm:rounded-b-3xl border-none shadow-[0_3px_12px_-2px_rgba(0,0,0,0.06)] dark:shadow-[0_3px_12px_-2px_rgba(0,0,0,0.35)]">
          <div className="flex items-center gap-3">
            <button
              type="button"
              aria-label="Back to profile"
              onClick={onBack}
              className="flex size-10 items-center justify-center rounded-full bg-muted text-foreground transition-transform active:scale-95 hover:bg-accent"
            >
              <ArrowLeft className="size-5" />
            </button>
            <div>
              <h1 className="text-base font-black tracking-tight text-foreground">
                Favourite Stores
              </h1>
              <p className="text-[11px] font-medium text-muted-foreground">
                Preferred partner laundry stores
              </p>
            </div>
          </div>
          {stores.length > 0 ? (
            <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-black text-primary">
              {stores.length}
            </span>
          ) : null}
        </header>

        {/* Content */}
        <div className="px-5 pt-5 space-y-3">
          {loading ? (
            <div className="py-20 text-center">
              <Loader2 className="mx-auto size-7 animate-spin text-primary" />
              <p className="mt-3 text-xs font-semibold text-muted-foreground">Loading favourite stores…</p>
            </div>
          ) : stores.length === 0 ? (
            <div className="card-soft py-16 px-6 text-center border border-border mt-4">
              <div className="mx-auto flex size-16 items-center justify-center rounded-3xl bg-primary/15 text-brand-dark mb-4 shadow-xs">
                <Store className="size-8" />
              </div>
              <h3 className="text-base font-bold text-foreground">No favourite stores yet</h3>
              <p className="mt-1.5 text-xs text-muted-foreground max-w-xs mx-auto leading-relaxed">
                Mark your trusted laundry partners as favourite to quickly view their menu, offers, and express turnaround slots.
              </p>
              <button
                type="button"
                onClick={() => {
                  onBack();
                  void navigate({ to: "/home" });
                }}
                className="mt-6 inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-primary px-6 text-xs font-bold text-primary-foreground shadow-cta hover:brightness-105 active:scale-95 transition-all"
              >
                <Store className="size-4" />
                <span>Find Nearby Partners</span>
              </button>
            </div>
          ) : (
            stores.map((store) => (
              <div
                key={store.id}
                onClick={() => {
                  onBack();
                  void navigate({
                    to: "/partner/$partnerId",
                    params: { partnerId: store.partnerId },
                    search: { highlightService: undefined },
                  });
                }}
                className="card-soft group relative flex items-center gap-3.5 p-4 border border-border hover:border-primary/50 cursor-pointer active:scale-[0.99] transition-all"
              >
                <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-muted overflow-hidden border border-border shadow-xs">
                  <Store className="size-6 text-muted-foreground" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h4 className="truncate text-sm font-bold text-foreground">{store.name}</h4>
                    <span className="flex items-center gap-0.5 rounded-md bg-amber-400/15 px-1.5 py-0.5 text-[10px] font-black text-amber-600 dark:text-amber-400">
                      <Star className="size-2.5 fill-current" />
                      {store.rating.toFixed(1)}
                    </span>
                  </div>
                  <p className="mt-1 truncate text-[11px] text-muted-foreground">
                    {store.area ? `${store.area}, ${store.city}` : store.city}
                  </p>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    aria-label="Remove from favourites"
                    onClick={(e) => handleRemove(store.partnerId, e)}
                    className="flex size-9 items-center justify-center rounded-xl text-muted-foreground hover:bg-destructive/10 hover:text-destructive active:scale-90 transition-all"
                  >
                    <Trash2 className="size-4" />
                  </button>
                  <span className="flex size-8 items-center justify-center rounded-xl bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                    <ArrowRight className="size-4" />
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </main>
  );
}

/* ==========================================================================
   FULL PAGE: Notification Settings
   ========================================================================== */
function NotificationSettingsPage({
  onBack,
  notificationRows,
  notifications,
  saving,
  onToggleNotification,
}: {
  onBack: () => void;
  devicePermission?: DevicePermissionStatus;
  requestingDevicePerm?: boolean;
  onRequestDevicePermission?: () => Promise<void>;
  onSendTestNotification?: () => void;
  notificationRows: { id: keyof NotificationPreferences; label: string; note: string }[];
  notifications: NotificationPreferences;
  saving: boolean;
  onToggleNotification: (key: keyof NotificationPreferences) => void;
}) {
  return (
    <main className="relative min-h-screen overflow-x-hidden bg-white dark:bg-zinc-950">
      <div className="relative mx-auto w-full max-w-md pb-32">
        {/* Top App Bar */}
        <header className="sticky top-0 z-30 flex items-center justify-between px-4 py-3.5 bg-white/85 dark:bg-zinc-950/85 backdrop-blur-md rounded-b-2xl sm:rounded-b-3xl border-none shadow-[0_3px_12px_-2px_rgba(0,0,0,0.06)] dark:shadow-[0_3px_12px_-2px_rgba(0,0,0,0.35)]">
          <div className="flex items-center gap-3">
            <button
              type="button"
              aria-label="Back to profile"
              onClick={onBack}
              className="flex size-10 items-center justify-center rounded-full bg-muted text-foreground transition-transform active:scale-95 hover:bg-accent"
            >
              <ArrowLeft className="size-5" />
            </button>
            <div>
              <h1 className="text-base font-black tracking-tight text-foreground">
                Notification Settings
              </h1>
              <p className="text-[11px] font-medium text-muted-foreground">
                Manage alerts & push permissions
              </p>
            </div>
          </div>
        </header>

        {/* Content */}
        <div className="px-5 pt-5 space-y-4">

          {/* In-App Channels */}
          <div>
            <h2 className="px-1 text-[11px] font-black uppercase tracking-wider text-muted-foreground mb-2">
              In-App & Message Channels
            </h2>
            <div className="card-soft overflow-hidden border border-border divide-y divide-border">
              {notificationRows.map((row) => (
                <div key={row.id} className="flex items-center gap-3 px-4 py-3.5">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-xs font-bold text-foreground">
                      {row.label}
                    </span>
                    <span className="block truncate text-[11px] text-muted-foreground mt-0.5">
                      {row.note}
                    </span>
                  </span>
                  <Toggle
                    label={row.label}
                    checked={notifications[row.id]}
                    disabled={saving}
                    onChange={() => onToggleNotification(row.id)}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Privacy Assurance */}
          <div className="card-soft flex items-start gap-3 p-4 border border-border">
            <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-xl bg-secondary/15 text-brand-green">
              <ShieldCheck className="size-4" />
            </span>
            <div>
              <p className="text-xs font-bold text-foreground">Zero Spam Guarantee</p>
              <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
                QuickPress sends strictly transactional and critical updates. You have 100% control over all notification channels.
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

/* ==========================================================================
   FULL PAGE: Appearance
   ========================================================================== */
function AppearanceSettingsPage({
  onBack,
  currentTheme,
  saving,
  onChangeTheme,
}: {
  onBack: () => void;
  currentTheme: ThemeMode;
  saving: boolean;
  onChangeTheme: (mode: ThemeMode) => Promise<void>;
}) {
  return (
    <main className="relative min-h-screen overflow-x-hidden bg-white dark:bg-zinc-950">
      <div className="relative mx-auto w-full max-w-md pb-32">
        {/* Top App Bar */}
        <header className="sticky top-0 z-30 flex items-center justify-between px-4 py-3.5 bg-white/85 dark:bg-zinc-950/85 backdrop-blur-md rounded-b-2xl sm:rounded-b-3xl border-none shadow-[0_3px_12px_-2px_rgba(0,0,0,0.06)] dark:shadow-[0_3px_12px_-2px_rgba(0,0,0,0.35)]">
          <div className="flex items-center gap-3">
            <button
              type="button"
              aria-label="Back to profile"
              onClick={onBack}
              className="flex size-10 items-center justify-center rounded-full bg-muted text-foreground transition-transform active:scale-95 hover:bg-accent"
            >
              <ArrowLeft className="size-5" />
            </button>
            <div>
              <h1 className="text-base font-black tracking-tight text-foreground">
                Appearance
              </h1>
              <p className="text-[11px] font-medium text-muted-foreground">
                Choose theme and display mode
              </p>
            </div>
          </div>
        </header>

        {/* Content */}
        <div className="px-5 pt-5 space-y-4">
          <p className="px-1 text-xs text-muted-foreground leading-relaxed">
            Choose how QuickPress looks on your device. Themes adjust contrast, backgrounds, and cards instantly.
          </p>

          <div className="space-y-3">
            {[
              {
                id: "light" as ThemeMode,
                label: "Light Mode",
                description: "Crisp white background with dark typography",
                icon: Sun,
                accentBg: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
              },
              {
                id: "dark" as ThemeMode,
                label: "Dark Mode",
                description: "Sleek dark theme, easy on the eyes in low light",
                icon: Moon,
                accentBg: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400",
              },
              {
                id: "system" as ThemeMode,
                label: "System Default",
                description: "Automatically matches your device's display setting",
                icon: Monitor,
                accentBg: "bg-zinc-500/10 text-zinc-600 dark:text-zinc-400",
              },
            ].map((option) => {
              const active = currentTheme === option.id;
              return (
                <button
                  key={option.id}
                  type="button"
                  aria-pressed={active}
                  disabled={saving}
                  onClick={() => void onChangeTheme(option.id)}
                  className={`card-soft flex w-full items-center gap-4 p-4 text-left border transition-all duration-200 active:scale-[0.98] disabled:opacity-60 ${
                    active
                      ? "border-primary bg-primary/10 shadow-sm ring-1 ring-primary/40"
                      : "border-border hover:bg-muted/40"
                  }`}
                >
                  <div
                    className={`flex size-12 shrink-0 items-center justify-center rounded-2xl ${
                      active ? "bg-primary text-primary-foreground" : option.accentBg
                    }`}
                  >
                    <option.icon className="size-6" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-foreground">{option.label}</span>
                      {active ? (
                        <span className="flex items-center gap-1 text-xs font-black text-primary">
                          Active ✓
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">{option.description}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </main>
  );
}

/* ==========================================================================
   FULL PAGE: Language
   ========================================================================== */
function LanguageSettingsPage({
  onBack,
  currentLanguage,
  saving,
  onChangeLanguage,
}: {
  onBack: () => void;
  currentLanguage?: string;
  saving: boolean;
  onChangeLanguage: (code: string) => Promise<void>;
}) {
  return (
    <main className="relative min-h-screen overflow-x-hidden bg-white dark:bg-zinc-950">
      <div className="relative mx-auto w-full max-w-md pb-32">
        {/* Top App Bar */}
        <header className="sticky top-0 z-30 flex items-center justify-between px-4 py-3.5 bg-white/85 dark:bg-zinc-950/85 backdrop-blur-md rounded-b-2xl sm:rounded-b-3xl border-none shadow-[0_3px_12px_-2px_rgba(0,0,0,0.06)] dark:shadow-[0_3px_12px_-2px_rgba(0,0,0,0.35)]">
          <div className="flex items-center gap-3">
            <button
              type="button"
              aria-label="Back to profile"
              onClick={onBack}
              className="flex size-10 items-center justify-center rounded-full bg-muted text-foreground transition-transform active:scale-95 hover:bg-accent"
            >
              <ArrowLeft className="size-5" />
            </button>
            <div>
              <h1 className="text-base font-black tracking-tight text-foreground">
                Language / भाषा
              </h1>
              <p className="text-[11px] font-medium text-muted-foreground">
                Switch application language
              </p>
            </div>
          </div>
        </header>

        {/* Content */}
        <div className="px-5 pt-5 space-y-4">
          <p className="px-1 text-xs text-muted-foreground leading-relaxed">
            Selecting a language immediately translates the full QuickPress app in real-time across home, bookings, and support.
          </p>

          <div className="space-y-3">
            {[
              {
                id: "en-IN",
                title: "English (India)",
                subtitle: "Default application language",
                badge: "EN",
              },
              {
                id: "hi-IN",
                title: "हिन्दी (Hindi)",
                subtitle: "संपूर्ण एप्लिकेशन हिन्दी में अनुवादित होगी",
                badge: "हि",
              },
            ].map((item) => {
              const active =
                currentLanguage === item.id ||
                (item.id === "en-IN" && !currentLanguage?.startsWith("hi"));
              return (
                <button
                  key={item.id}
                  type="button"
                  aria-pressed={active}
                  disabled={saving}
                  onClick={() => void onChangeLanguage(item.id)}
                  className={`card-soft flex w-full items-center gap-4 p-4 text-left border transition-all duration-200 active:scale-[0.98] disabled:opacity-60 ${
                    active
                      ? "border-primary bg-primary/10 shadow-sm ring-1 ring-primary/40"
                      : "border-border hover:bg-muted/40"
                  }`}
                >
                  <div
                    className={`flex size-12 shrink-0 items-center justify-center rounded-2xl font-black text-base ${
                      active
                        ? "bg-primary text-primary-foreground shadow-xs"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {item.badge}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-foreground">{item.title}</span>
                      {active ? (
                        <span className="flex items-center gap-1 text-xs font-black text-primary">
                          Selected ✓
                        </span>
                      ) : null}
                    </div>
                    <span className="block text-xs text-muted-foreground mt-0.5">
                      {item.subtitle}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="card-soft p-4 border border-border mt-6">
            <p className="text-xs font-bold text-foreground">More Regional Languages Coming Soon</p>
            <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">
              We are working to bring Marathi, Gujarati, Punjabi, Bengali, Tamil, and Telugu to QuickPress.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}

/* ==========================================================================
   FULL PAGE: Legal & Privacy
   ========================================================================== */
function LegalPrivacyPage({
  onBack,
  onRequestDelete,
}: {
  onBack: () => void;
  onRequestDelete: () => void;
}) {
  return (
    <main className="relative min-h-screen overflow-x-hidden bg-white dark:bg-zinc-950">
      <div className="relative mx-auto w-full max-w-md pb-32">
        {/* Top App Bar */}
        <header className="sticky top-0 z-30 flex items-center justify-between px-4 py-3.5 bg-white/85 dark:bg-zinc-950/85 backdrop-blur-md rounded-b-2xl sm:rounded-b-3xl border-none shadow-[0_3px_12px_-2px_rgba(0,0,0,0.06)] dark:shadow-[0_3px_12px_-2px_rgba(0,0,0,0.35)]">
          <div className="flex items-center gap-3">
            <button
              type="button"
              aria-label="Back to profile"
              onClick={onBack}
              className="flex size-10 items-center justify-center rounded-full bg-muted text-foreground transition-transform active:scale-95 hover:bg-accent"
            >
              <ArrowLeft className="size-5" />
            </button>
            <div>
              <h1 className="text-base font-black tracking-tight text-foreground">
                Legal & Privacy
              </h1>
              <p className="text-[11px] font-medium text-muted-foreground">
                Privacy, policies & data governance
              </p>
            </div>
          </div>
        </header>

        {/* Content */}
        <div className="px-5 pt-5 space-y-4">
          <div>
            <h2 className="px-1 text-[11px] font-black uppercase tracking-wider text-muted-foreground mb-2">
              Statutory Documents
            </h2>
            <div className="card-soft overflow-hidden border border-border divide-y divide-border">
              <Link
                to="/legal/$docSlug"
                params={{ docSlug: "privacy-policy" }}
                className="flex items-center justify-between p-4 hover:bg-muted/40 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="text-xl">🛡️</span>
                  <div>
                    <p className="text-xs font-bold text-foreground">Privacy Policy</p>
                    <p className="text-[11px] text-muted-foreground">How your personal & location data is protected</p>
                  </div>
                </div>
                <ChevronRight className="size-4 text-muted-foreground" />
              </Link>

              <Link
                to="/legal/$docSlug"
                params={{ docSlug: "terms-of-service" }}
                className="flex items-center justify-between p-4 hover:bg-muted/40 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="text-xl">📜</span>
                  <div>
                    <p className="text-xs font-bold text-foreground">Terms & Conditions</p>
                    <p className="text-[11px] text-muted-foreground">Garment care, SLAs, and customer agreement</p>
                  </div>
                </div>
                <ChevronRight className="size-4 text-muted-foreground" />
              </Link>

              <Link
                to="/legal/$docSlug"
                params={{ docSlug: "cancellation-refund-policy" }}
                className="flex items-center justify-between p-4 hover:bg-muted/40 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="text-xl">🔄</span>
                  <div>
                    <p className="text-xs font-bold text-foreground">Cancellation & Refunds</p>
                    <p className="text-[11px] text-muted-foreground">Order cancellation windows and refund timelines</p>
                  </div>
                </div>
                <ChevronRight className="size-4 text-muted-foreground" />
              </Link>

              <Link
                to="/legal/$docSlug"
                params={{ docSlug: "grievance-redressal" }}
                className="flex items-center justify-between p-4 hover:bg-muted/40 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="text-xl">⚖️</span>
                  <div>
                    <p className="text-xs font-bold text-foreground">Grievance Redressal & Nodal Officer</p>
                    <p className="text-[11px] text-muted-foreground">Statutory consumer dispute escalation desk</p>
                  </div>
                </div>
                <ChevronRight className="size-4 text-muted-foreground" />
              </Link>
            </div>
          </div>

          {/* Data Protection Standard Card */}
          <div className="card-soft p-4 border border-border bg-muted/20 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-foreground">Data Encryption Standard</span>
              <span className="text-[10px] font-black text-brand-green bg-secondary/15 px-2.5 py-0.5 rounded-full border border-secondary/20">
                TLS 1.3 Active
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Your location, phone number, and order records are end-to-end encrypted and strictly used for order pickup and delivery fulfillment. We do not sell or monetize personal customer data.
            </p>
          </div>

          {/* Action Cards */}
          <div>
            <h2 className="px-1 text-[11px] font-black uppercase tracking-wider text-muted-foreground mb-2">
              Data Rights & Account Control
            </h2>
            <div className="space-y-2.5">
              <a
                href="mailto:official.quickpress@gmail.com?subject=Privacy%20and%20Data%20Support%20Request"
                className="card-soft flex items-center justify-between p-4 border border-border hover:bg-muted/40 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="text-xl">✉️</span>
                  <div>
                    <p className="text-xs font-bold text-foreground">Request Data / Privacy Support</p>
                    <p className="text-[11px] text-muted-foreground">Contact our Data Grievance Officer</p>
                  </div>
                </div>
                <ChevronRight className="size-4 text-muted-foreground" />
              </a>

              <button
                type="button"
                onClick={onRequestDelete}
                className="card-soft w-full flex items-center justify-between p-4 border border-destructive/30 bg-destructive/5 hover:bg-destructive/10 transition-colors text-left"
              >
                <div className="flex items-center gap-3">
                  <Trash2 className="size-4 text-destructive" />
                  <div>
                    <p className="text-xs font-bold text-destructive">Request Account Deletion</p>
                    <p className="text-[11px] text-destructive/80">Permanent data erasure & account closure</p>
                  </div>
                </div>
                <ChevronRight className="size-4 text-destructive/70" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
