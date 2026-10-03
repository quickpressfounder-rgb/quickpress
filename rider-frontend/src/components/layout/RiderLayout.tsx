import { useNavigate } from "@tanstack/react-router";
import { type ReactNode, useEffect, useState } from "react";
import { RiderSidebar } from "./RiderSidebar";
import { RiderDesktopTopBar } from "./RiderDesktopTopBar";
import { RiderBottomNav, type RiderTabId } from "../RiderBottomNav";
import { useRiderContext } from "../../context/RiderContext";
import { readSession } from "../../api/core/session-store";

export function RiderLayout({
  children,
  activeTab = "dashboard",
  title = "Captain Hub",
  subtitle = "Accept live laundry pickups & track earnings",
  searchQuery,
  onSearchChange,
  hideBottomNav = false,
}: {
  children: ReactNode;
  activeTab?: RiderTabId;
  title?: string;
  subtitle?: string;
  searchQuery?: string;
  onSearchChange?: (q: string) => void;
  hideBottomNav?: boolean;
}) {
  const navigate = useNavigate();
  const { session, hydrating, isOnline, setOnline, signOut } = useRiderContext();

  const captainName =
    session?.fullName && session.fullName !== "Delivery Captain" && session.fullName !== "Delivery Partner"
      ? session.fullName
      : (typeof window !== "undefined" ? localStorage.getItem("qp_rider_government_name") || "" : "");
  const captainId =
    session?.riderId && session.riderId !== "CP-9821" && session.riderId !== "CAP-100101"
      ? session.riderId
      : (typeof window !== "undefined" ? localStorage.getItem("qp_rider_id") || "" : "");

  // Strict Auth Guard: If not logged in and hydration finished, redirect to /auth
  useEffect(() => {
    if (!hydrating && !session) {
      const stored = readSession("rider") || readSession();
      if (!stored || !stored.token) {
        void navigate({ to: "/auth" });
      }
    }
  }, [hydrating, session, navigate]);

  // Initialize Google Translate globally
  useEffect(() => {
    import("../../lib/google-translate").then((m) => m.initGoogleTranslateScript());
  }, []);

  const handleToggleDuty = () => {
    // Play Web Audio chime
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = "sine";
      osc.frequency.setValueAtTime(isOnline ? 440 : 880, ctx.currentTime);
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
      osc.start();
      osc.stop(ctx.currentTime + 0.3);
    } catch {
      /* ignore */
    }
    setOnline(!isOnline);
  };

  const handleLogout = () => {
    signOut();
    void navigate({ to: "/auth" });
  };

  if (hydrating || !session) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <div className="flex flex-col items-center gap-3">
          <div className="size-8 animate-spin rounded-full border-2 border-emerald-600 border-t-transparent" />
          <p className="text-xs font-bold text-slate-500">Checking Captain session...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-slate-50/60 text-slate-900 font-sans">
      {/* Desktop Left Sidebar (>= md) */}
      <RiderSidebar
        captainName={captainName}
        captainId={captainId}
        isOnline={isOnline}
        onToggleStatus={handleToggleDuty}
        onLogout={handleLogout}
      />

      {/* Main Content Area */}
      <div className="flex min-w-0 flex-1 flex-col overflow-x-hidden">
        {/* Desktop Top Bar */}
        <RiderDesktopTopBar
          title={title}
          subtitle={subtitle}
          captainName={captainName}
          isOnline={isOnline}
          onToggleStatus={handleToggleDuty}
          searchQuery={searchQuery}
          onSearchChange={onSearchChange}
        />

        {/* Mobile Top Bar (for non-dashboard tabs: Orders, Finance, More) */}
        {activeTab !== "dashboard" ? (
          <div
            className="w-full bg-white/95 backdrop-blur-md border-b border-emerald-100 px-4 pb-3 sm:px-6 md:hidden sticky top-0 z-30 select-none shadow-2xs"
            style={{ paddingTop: "max(calc(env(safe-area-inset-top, 0px) + 10px), 36px)" }}
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <h1 className="text-lg font-black tracking-tight text-emerald-950">{title}</h1>
                {subtitle ? <p className="text-[11px] font-semibold text-slate-500">{subtitle}</p> : null}
              </div>
              <div
                className={`flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-extrabold ${
                  isOnline
                    ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                    : "bg-slate-100 text-slate-600 border border-slate-200"
                }`}
              >
                <span className={`size-1.5 rounded-full ${isOnline ? "bg-emerald-600 animate-ping" : "bg-slate-400"}`} />
                <span>{isOnline ? "ONLINE" : "OFFLINE"}</span>
              </div>
            </div>
          </div>
        ) : null}

        {/* Page Children Container */}
        <main className="flex-1 pb-28 lg:pb-8">{children}</main>

        {/* Mobile Floating Glass Dock Navigation */}
        {!hideBottomNav ? <RiderBottomNav active={activeTab} /> : null}

        {/* Google Translate Hidden Engine Container */}
        <div id="google_translate_element" className="hidden" aria-hidden="true" />
      </div>
    </div>
  );
}
