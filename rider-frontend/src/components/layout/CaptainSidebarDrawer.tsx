import React, { useState, useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  ArrowRight,
  Award,
  Bell,
  Bike,
  CheckCircle2,
  ChevronRight,
  Gift,
  HelpCircle,
  History,
  LogOut,
  MapPin,
  Navigation,
  Package,
  ShieldCheck,
  TrendingUp,
  Volume2,
  VolumeX,
  Wallet,
  X,
  Zap,
} from "lucide-react";
import { useLanguage } from "../../lib/i18n";
import { toast } from "sonner";
import { useRiderContext } from "../../context/RiderContext";
import {
  getAudioLanguage,
  isAudioMuted,
  playOrderAlertSound,
  setAudioLanguage,
  setAudioMuted,
  speakText,
  stopOrderAlertSound,
  triggerHaptic,
} from "../../lib/captain-audio";
import { CaptainSupportModal } from "../support/CaptainSupportModal";
import { CaptainGuidelinesModal } from "../support/CaptainGuidelinesModal";
import { CaptainRouteBookingModal } from "../navigation/CaptainRouteBookingModal";
import {
  fetchRouteBookingState,
  toggleRouteBooking,
  type RouteBookingState,
} from "../../api/rider/rider-route-booking-api";

interface CaptainSidebarDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  captainName?: string;
  captainId?: string;
  captainPhoto?: string;
  rating?: number;
  onLogout?: () => void;
  onOpenLanguage?: () => void;
  onOpenOnboarding?: () => void;
}

export const CaptainSidebarDrawer: React.FC<CaptainSidebarDrawerProps> = ({
  isOpen,
  onClose,
  captainName = "Captain",
  captainId = "RDR-8821",
  captainPhoto,
  rating = 4.9,
  onLogout,
  onOpenLanguage,
  onOpenOnboarding,
}) => {
  const navigate = useNavigate();
  const { signOut, session } = useRiderContext();
  const { t, selectedLanguageObj } = useLanguage();

  const [routeState, setRouteState] = useState<RouteBookingState | null>(null);
  const [showRouteModal, setShowRouteModal] = useState(false);
  const [routeToggleLoading, setRouteToggleLoading] = useState(false);
  const [showAudioModal, setShowAudioModal] = useState(false);
  const [showSupportModal, setShowSupportModal] = useState(false);
  const [showGuidelinesModal, setShowGuidelinesModal] = useState(false);
  const [isMuted, setIsMutedState] = useState(() => isAudioMuted());
  const [audioLang, setAudioLangState] = useState(() => getAudioLanguage());

  // Load real route booking state on drawer open
  useEffect(() => {
    if (isOpen) {
      void fetchRouteBookingState()
        .then((res) => setRouteState(res))
        .catch(() => undefined);
    }
  }, [isOpen]);

  const effectivePhoto =
    captainPhoto ||
    (typeof window !== "undefined" ? window.localStorage.getItem("qp_rider_profile_photo") : null);

  if (!isOpen) return null;

  const handleLogoutAction = () => {
    triggerHaptic();
    onClose();
    if (onLogout) {
      onLogout();
    } else {
      signOut();
      toast.success("Logged out successfully. See you soon, Captain! 🛵");
      navigate({ to: "/auth" });
    }
  };

  const handleOpenProfile = () => {
    onClose();
    navigate({ to: "/profile" });
  };

  const handleToggleMute = () => {
    const next = !isMuted;
    setIsMutedState(next);
    setAudioMuted(next);
    triggerHaptic(next ? [80] : [80, 40, 100]);
    toast.info(next ? "Audio Alerts Muted 🔇" : "Audio Alerts Enabled 🔊");
  };

  const handleToggleAudioLanguage = (lang: "hi-IN" | "en-IN") => {
    setAudioLangState(lang);
    setAudioLanguage(lang);
    triggerHaptic(40);
    const prompt = lang.startsWith("hi") ? "हिन्दी ध्वनि सक्रिय है" : "English voice active";
    speakText(prompt, true);
    toast.success(`Voice language set to ${lang.startsWith("hi") ? "हिन्दी 🇮🇳" : "English 🇬🇧"}`);
  };

  const handleTestSiren = () => {
    triggerHaptic();
    toast.info("Testing loud order alert siren for 4 seconds...");
    playOrderAlertSound();
    setTimeout(() => {
      stopOrderAlertSound();
    }, 4000);
  };

  const handleTestVoicePrompt = () => {
    triggerHaptic();
    const prompt = audioLang.startsWith("hi")
      ? "नया ऑर्डर! किराया 65 रुपये। मेन रोड कासगंज से पिकअप करें।"
      : "New order! Earning 65 rupees. Pickup from Main Road Kasganj.";
    speakText(prompt, true);
    toast.info("Testing turn-by-turn voice prompt...");
  };

  return (
    <>
      <div
        onClick={onClose}
        className="fixed inset-0 z-50 flex justify-start bg-black/60 backdrop-blur-xs select-none animate-in fade-in duration-200"
      >
        {/* Drawer Container (Pure White Background with Elegant Right Curve) */}
        <div
          onClick={(e) => e.stopPropagation()}
          className="relative flex flex-col w-[84vw] max-w-[340px] h-[100dvh] bg-white text-neutral-900 shadow-2xl rounded-r-3xl border-r border-neutral-200/80 overflow-hidden animate-in slide-in-from-left duration-300"
        >
          {/* 1. Header with Close Button & Profile Badge (Fixed with Safe Area Padding) */}
          <div
            className="px-4 pb-3 bg-white border-b border-neutral-100 shrink-0"
            style={{
              paddingTop: "max(env(safe-area-inset-top, 0px) + 12px, 22px)",
            }}
          >
            <div className="flex items-center justify-between pb-3">
              <div className="flex items-center gap-2">
                <img
                  src="/quickpress-brand-logo-transparent.png"
                  alt="QuickPress"
                  className="h-6 w-auto object-contain"
                />
                <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 tracking-wider uppercase">
                  Captain
                </span>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="flex items-center justify-center w-8 h-8 rounded-full bg-neutral-100 hover:bg-neutral-200 text-neutral-600 hover:text-neutral-900 active:scale-90 transition-all"
                aria-label="Close Drawer"
              >
                <X className="w-4.5 h-4.5 stroke-[2.5]" />
              </button>
            </div>

            {/* Profile Card (Clickable to open /profile) */}
            <button
              type="button"
              onClick={handleOpenProfile}
              className="w-full flex items-center justify-between p-3 bg-amber-50/90 hover:bg-amber-100/80 border border-amber-200/90 rounded-2xl text-left active:scale-98 transition-all shadow-2xs"
            >
              <div className="flex items-center gap-3">
                {effectivePhoto ? (
                  <img
                    src={effectivePhoto}
                    alt={captainName}
                    className="w-11 h-11 rounded-full object-cover border border-amber-300 shadow-xs shrink-0"
                  />
                ) : (
                  <div className="flex items-center justify-center w-11 h-11 rounded-full bg-amber-400 text-neutral-950 font-black text-base shadow-xs shrink-0">
                    {captainName.slice(0, 1).toUpperCase()}
                  </div>
                )}
                <div>
                  <h3 className="text-sm font-black text-neutral-950 leading-tight">
                    {captainName}
                  </h3>
                  <p className="text-[11px] font-bold text-neutral-500 mt-0.5 font-mono">
                    ID: {captainId}
                  </p>
                  <div className="flex items-center gap-1 mt-0.5">
                    <span className="text-[10px] font-black text-emerald-700 bg-emerald-100 px-1.5 py-0.2 rounded-md">
                      {rating.toFixed(1)} ★ Verified
                    </span>
                  </div>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-neutral-400 shrink-0" />
            </button>
          </div>

          {/* 2. Scrollable Middle Body (Route Booking + Navigation List) */}
          <div className="flex-1 overflow-y-auto overscroll-contain">
            {/* Route Booking Interactive Card */}
            <div className="p-3 border-b border-neutral-100 bg-neutral-50/50">
              <div
                onClick={() => setShowRouteModal(true)}
                className="flex items-center justify-between p-3 bg-white rounded-2xl border border-neutral-200/80 shadow-2xs hover:border-blue-300 transition-all cursor-pointer"
              >
                <div className="flex items-center gap-2.5 min-w-0 flex-1 pr-2">
                  <div
                    className={`flex items-center justify-center size-8.5 rounded-xl shrink-0 transition-colors ${
                      routeState?.isActive
                        ? "bg-emerald-50 text-emerald-600 border border-emerald-200"
                        : "bg-blue-50 text-blue-600 border border-blue-200"
                    }`}
                  >
                    <Navigation className="size-4.5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <h4 className="text-xs font-black text-neutral-900 leading-tight">
                        My Route Booking
                      </h4>
                      <span
                        className={`text-[9px] font-black px-1.5 py-0.2 rounded-full border ${
                          routeState?.isActive
                            ? "bg-emerald-50 text-emerald-700 border-emerald-300"
                            : "bg-neutral-100 text-neutral-600 border-neutral-200"
                        }`}
                      >
                        {routeState?.isActive ? "ACTIVE 🟢" : "OFF"}
                      </span>
                    </div>
                    <p className="text-[10px] text-neutral-500 font-medium truncate mt-0.5">
                      {routeState?.isActive
                        ? `Heading to ${routeState.destination?.name || "Home"} (±${routeState.maxDetourKm || 2} km)`
                        : "Deliveries only on your home route"}
                    </p>
                  </div>
                </div>

                {/* iOS style toggle switch */}
                <button
                  type="button"
                  disabled={routeToggleLoading}
                  onClick={async (e) => {
                    e.stopPropagation();
                    triggerHaptic();
                    setRouteToggleLoading(true);
                    try {
                      const next = !routeState?.isActive;
                      const res = await toggleRouteBooking(next);
                      if (res.ok) {
                        setRouteState(res.state);
                        toast.success(
                          next
                            ? "Home Route Booking Enabled 🏠"
                            : "Home Route Booking Disabled"
                        );
                      } else {
                        toast.error(res.error || "Failed to toggle route booking");
                        if (res.error?.includes("configure")) {
                          setShowRouteModal(true);
                        }
                      }
                    } catch {
                      toast.error("Could not update Route Booking.");
                    } finally {
                      setRouteToggleLoading(false);
                    }
                  }}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    routeState?.isActive ? "bg-[#00C853]" : "bg-neutral-300"
                  } ${routeToggleLoading ? "opacity-60" : ""}`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      routeState?.isActive ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>
            </div>

            {/* Navigation List */}
            <div className="p-3 space-y-1">
              {[
                {
                  icon: Package,
                  title: t("orders.liveQueue", "Live Orders Queue"),
                  sub: "Instant customer laundry dispatches",
                  onClick: () => {
                    onClose();
                    navigate({ to: "/orders" });
                  },
                },
                {
                  icon: Bell,
                  title: "Notifications",
                  sub: "Live alerts, dispatches & payouts",
                  onClick: () => {
                    onClose();
                    navigate({ to: "/notifications" });
                  },
                },
                {
                  icon: Wallet,
                  title: t("wallet.title", "Earnings & Wallet"),
                  sub: "Instant daily UPI bank payout",
                  onClick: () => {
                    onClose();
                    navigate({ to: "/wallet" });
                  },
                },
                {
                  icon: Award,
                  title: t("leaderboard.title", "City Leaderboard"),
                  sub: "Rank #1 wins ₹500 Weekly Prize Pool",
                  onClick: () => {
                    onClose();
                    navigate({ to: "/leaderboard" });
                  },
                },
                {
                  icon: History,
                  title: "Order & Trip History",
                  sub: "Delivered trips, OTP logs & payout receipts",
                  onClick: () => {
                    onClose();
                    navigate({ to: "/history" });
                  },
                },
                {
                  icon: TrendingUp,
                  title: t("incentives.title", "Incentives & Targets"),
                  sub: "Daily milestone bonus tracker & quests",
                  onClick: () => {
                    onClose();
                    navigate({ to: "/incentives" });
                  },
                },
                {
                  icon: Volume2,
                  title: "Audio & Voice Guidance",
                  sub: isMuted ? "Sound alerts are MUTED" : "Siren & voice prompts ACTIVE",
                  onClick: () => {
                    setShowAudioModal(true);
                  },
                },
                {
                  icon: ShieldCheck,
                  title: t("profile.guidelines", "Captain Guidelines & SOP"),
                  sub: "Zero Commission & SOP Workflow",
                  onClick: () => {
                    setShowGuidelinesModal(true);
                  },
                },
                {
                  icon: HelpCircle,
                  title: t("profile.support", "24/7 Captain Support & SOS"),
                  sub: "Helpline: +91 92587 30561 · Live Support",
                  onClick: () => {
                    setShowSupportModal(true);
                  },
                },
              ].map((item, idx) => {
                const Icon = item.icon;
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={item.onClick}
                    className="w-full flex items-center justify-between p-3 rounded-2xl hover:bg-neutral-50 text-left active:scale-98 transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center w-8 h-8 rounded-xl bg-neutral-100 text-neutral-700 shrink-0">
                        <Icon className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-xs font-black text-neutral-900 leading-tight">
                          {item.title}
                        </h4>
                        <p className="text-[10px] text-neutral-500 font-medium">
                          {item.sub}
                        </p>
                      </div>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-neutral-300" />
                  </button>
                );
              })}
            </div>
          </div>

          {/* 3. Language Switcher & Logout Footer (Fixed with Safe Area Bottom Padding) */}
          <div
            className="shrink-0 border-t border-neutral-100 bg-neutral-50/95 space-y-2 px-4 pt-3"
            style={{
              paddingBottom: "max(env(safe-area-inset-bottom, 0px) + 14px, 22px)",
            }}
          >
            {onOpenLanguage && (
              <button
                type="button"
                onClick={onOpenLanguage}
                className="w-full flex items-center justify-between p-2.5 bg-white border border-neutral-200/90 rounded-xl text-xs font-bold text-neutral-800 shadow-2xs hover:bg-neutral-50 active:scale-98 transition-all"
              >
                <span className="flex items-center gap-1.5">
                  <span>🌐</span>
                  <span>Language ({selectedLanguageObj.nativeName})</span>
                </span>
                <span className="text-[11px] font-black text-emerald-600">Change</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleLogoutAction}
              className="w-full flex items-center justify-center gap-2 py-2 text-xs font-bold text-red-600 hover:bg-red-50 rounded-xl transition-colors active:scale-98"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Logout Captain Account</span>
            </button>
          </div>
        </div>

        {/* Backdrop tap to close */}
        <div className="flex-1" onClick={onClose} />
      </div>

      {/* Audio & Voice Guidance Modal */}
      {showAudioModal && (
        <div
          onClick={() => setShowAudioModal(false)}
          className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs select-none animate-in fade-in duration-200"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm bg-white rounded-3xl p-5 shadow-2xl space-y-4 animate-in zoom-in-95 duration-200"
          >
            <div className="flex items-center justify-between pb-1 border-b border-neutral-100">
              <div className="flex items-center gap-2">
                <div className="flex items-center justify-center w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700">
                  <Volume2 className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-black text-neutral-900">Audio & Voice Guidance</h3>
              </div>
              <button
                onClick={() => setShowAudioModal(false)}
                className="p-1.5 text-neutral-400 hover:text-neutral-700 rounded-full"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Master Mute / Unmute */}
            <div className="flex items-center justify-between p-3 bg-neutral-50 rounded-2xl border border-neutral-200">
              <div>
                <p className="text-xs font-black text-neutral-900">Sound Alerts & Siren</p>
                <p className="text-[11px] text-neutral-500 font-medium">
                  {isMuted ? "Audio is currently MUTED" : "Audio is playing at full volume"}
                </p>
              </div>
              <button
                type="button"
                onClick={handleToggleMute}
                className={`px-3 py-1.5 text-xs font-black rounded-xl transition-all ${
                  isMuted
                    ? "bg-rose-100 text-rose-700 hover:bg-rose-200"
                    : "bg-[#00C853] text-white hover:bg-[#00B248]"
                }`}
              >
                {isMuted ? "Unmute 🔇" : "Active 🔊"}
              </button>
            </div>

            {/* Voice Navigation Language Switch */}
            <div className="space-y-2">
              <p className="text-xs font-black text-neutral-900">Voice Navigation Language</p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => handleToggleAudioLanguage("hi-IN")}
                  className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                    audioLang.startsWith("hi")
                      ? "border-[#00C853] bg-emerald-50 text-emerald-900 font-black shadow-xs"
                      : "border-neutral-200 bg-white text-neutral-700"
                  }`}
                >
                  <span>🇮🇳</span>
                  <span>हिन्दी (Hindi)</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleToggleAudioLanguage("en-IN")}
                  className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                    audioLang.startsWith("en")
                      ? "border-[#00C853] bg-emerald-50 text-emerald-900 font-black shadow-xs"
                      : "border-neutral-200 bg-white text-neutral-700"
                  }`}
                >
                  <span>🇬🇧</span>
                  <span>English (India)</span>
                </button>
              </div>
            </div>

            {/* Test Buttons */}
            <div className="space-y-2 pt-1">
              <p className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider">
                Sound Test Tools
              </p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={handleTestSiren}
                  className="py-2.5 px-3 bg-amber-500 hover:bg-amber-600 text-white text-xs font-black rounded-xl active:scale-95 shadow-sm"
                >
                  🚨 Test Siren
                </button>
                <button
                  type="button"
                  onClick={handleTestVoicePrompt}
                  className="py-2.5 px-3 bg-blue-600 hover:bg-blue-700 text-white text-xs font-black rounded-xl active:scale-95 shadow-sm"
                >
                  🗣️ Test Voice
                </button>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                stopOrderAlertSound();
                setShowAudioModal(false);
              }}
              className="w-full py-2.5 bg-neutral-900 hover:bg-neutral-800 text-white font-black text-xs rounded-xl active:scale-98"
            >
              Done
            </button>
          </div>
        </div>
      )}

      {/* 24/7 Support Modal */}
      <CaptainSupportModal
        isOpen={showSupportModal}
        onClose={() => setShowSupportModal(false)}
      />

      {/* Guidelines & SOP Modal */}
      <CaptainGuidelinesModal
        isOpen={showGuidelinesModal}
        onClose={() => setShowGuidelinesModal(false)}
      />

      {/* My Route Booking Engine Modal */}
      <CaptainRouteBookingModal
        isOpen={showRouteModal}
        onClose={() => setShowRouteModal(false)}
        onStateChange={(st) => setRouteState(st)}
      />
    </>
  );
};
