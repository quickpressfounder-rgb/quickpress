import { useEffect, useState, useRef } from "react";
import { useRouterState } from "@tanstack/react-router";
import { Check, Loader2, Sparkles, User, X } from "lucide-react";
import { toast } from "sonner";

import { fetchProfileData, updateProfile } from "@/api/customer/profile-api";
import { readSession } from "@/api/core/session-store";
import { writeCache, CACHE_KEYS } from "@/api/customer/api/cache";

const GENERIC_NAMES = [
  "customer",
  "quickpress customer",
  "quickpress user",
  "user",
  "guest",
  "client",
  "anonymous",
];

function isGenericName(name?: string | null): boolean {
  if (!name) return true;
  const clean = name.trim().toLowerCase();
  if (!clean || clean.length < 2) return true;
  return GENERIC_NAMES.some((g) => clean === g || clean.startsWith(g));
}

export function NamePromptModal() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isAuthRoute =
    pathname === "/login" ||
    pathname === "/auth" ||
    pathname.startsWith("/login") ||
    pathname.startsWith("/auth");

  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // If on login or auth screens, ensure modal is never open
  useEffect(() => {
    if (isAuthRoute && open) {
      setOpen(false);
    }
  }, [isAuthRoute, open]);

  const checkAndPrompt = async () => {
    // 1. NEVER show on login or authentication screens
    if (
      isAuthRoute ||
      (typeof window !== "undefined" &&
        (window.location.pathname.startsWith("/login") ||
          window.location.pathname.startsWith("/auth")))
    ) {
      setOpen(false);
      return;
    }

    // 2. Strict session check: user MUST be actively authenticated with valid token & account
    const session = readSession("customer");
    if (!session || !session.token || !session.account?.id) {
      setOpen(false);
      return;
    }

    // 3. Avoid re-prompting if dismissed in this active session
    const hasPrompted = sessionStorage.getItem("qp_name_prompt_dismissed");
    if (hasPrompted) return;

    try {
      const data = await fetchProfileData({ forceRefresh: true });

      // 4. Double check session validity after network request (session is cleared on 401)
      const freshSession = readSession("customer");
      if (!freshSession || !freshSession.token || !freshSession.account?.id) {
        setOpen(false);
        return;
      }

      // 5. Must be an actual authenticated customer with a phone number, NOT guest fallback
      if (!data?.user?.phone) {
        setOpen(false);
        return;
      }

      const currentName = data?.user?.name || "";
      if (isGenericName(currentName)) {
        setOpen(true);
        setTimeout(() => {
          inputRef.current?.focus();
        }, 300);
      }
    } catch {
      // Ignore network errors on initial check
    }
  };

  useEffect(() => {
    // Never run prompt timer on login / auth routes
    if (isAuthRoute) return;

    // Initial check on mount
    const timer = setTimeout(() => {
      void checkAndPrompt();
    }, 700);

    // Event listener for login event
    const handleLoginPrompt = () => {
      sessionStorage.removeItem("qp_name_prompt_dismissed");
      void checkAndPrompt();
    };

    window.addEventListener("qp:login-success", handleLoginPrompt);
    window.addEventListener("qp:prompt-name", handleLoginPrompt);

    return () => {
      clearTimeout(timer);
      window.removeEventListener("qp:login-success", handleLoginPrompt);
      window.removeEventListener("qp:prompt-name", handleLoginPrompt);
    };
  }, [isAuthRoute]);

  const handleDismiss = () => {
    sessionStorage.setItem("qp_name_prompt_dismissed", "true");
    setOpen(false);
  };

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanName = name.trim();
    if (!cleanName || cleanName.length < 2) {
      toast.error("Please enter your name");
      return;
    }

    setSaving(true);
    try {
      await updateProfile({ name: cleanName });
      
      // Update local cache so home screen greeting and header instantly update
      writeCache(CACHE_KEYS.profile, { name: cleanName, initials: cleanName.slice(0, 2).toUpperCase() });
      
      // Notify components
      window.dispatchEvent(new CustomEvent("qp:profile-updated", { detail: { name: cleanName } }));
      
      setOpen(false);
      sessionStorage.setItem("qp_name_prompt_dismissed", "true");
    } catch (err: any) {
      toast.error(err?.message || "Failed to save name. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  // NEVER render on auth / login screens, or if closed
  if (isAuthRoute || !open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="name-prompt-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
    >
      {/* Dark backdrop blur overlay */}
      <div
        onClick={handleDismiss}
        className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity duration-300 animate-in fade-in"
      />

      {/* Modal Dialog Content */}
      <div className="relative w-full max-w-sm overflow-hidden rounded-3xl border border-border/80 bg-card p-6 shadow-2xl transition-all duration-300 animate-in fade-in zoom-in-95">
        {/* Glow halo */}
        <div className="pointer-events-none absolute -top-12 left-1/2 size-36 -translate-x-1/2 rounded-full bg-primary/20 blur-2xl" />

        {/* Close Button */}
        <button
          type="button"
          onClick={handleDismiss}
          className="absolute right-4 top-4 flex size-8 items-center justify-center rounded-full bg-muted text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          aria-label="Close"
        >
          <X className="size-4" />
        </button>

        {/* Header with Avatar & Icon */}
        <div className="flex flex-col items-center text-center">
          <div className="relative mb-3.5 flex size-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-primary/20 via-primary/10 to-brand-green/20 text-primary shadow-xs">
            <User className="size-7" />
            <span className="absolute -bottom-1 -right-1 flex size-5 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-xs">
              <Sparkles className="size-3" />
            </span>
          </div>

          <h3
            id="name-prompt-title"
            className="text-xl font-black tracking-tight text-foreground"
          >
            What is your name?
          </h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Let us know what to call you for your orders and delivery updates.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSave} className="mt-5 space-y-4">
          <div className="relative">
            <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground">
              <User className="size-4" />
            </span>
            <input
              ref={inputRef}
              type="text"
              required
              autoFocus
              placeholder="Enter your full name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-12 w-full rounded-2xl border-2 border-border bg-background pl-10 pr-4 text-sm font-semibold text-foreground transition-all placeholder:font-normal placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>

          <div className="space-y-2 pt-1">
            <button
              type="submit"
              disabled={saving || !name.trim()}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-primary text-sm font-bold text-primary-foreground shadow-cta transition-all duration-300 hover:brightness-105 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Check className="size-4" />
                  Save & Continue
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleDismiss}
              className="w-full text-center text-xs font-semibold text-muted-foreground transition-colors hover:text-foreground py-1"
            >
              Skip for now
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
