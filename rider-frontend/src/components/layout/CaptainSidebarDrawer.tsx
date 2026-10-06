import React, { useState, useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  ArrowRight,
  Award,
  BarChart3,
  Bike,
  CheckCircle2,
  ChevronRight,
  Gift,
  HelpCircle,
  History,
  LogOut,
  MapPin,
  ShieldCheck,
  TrendingUp,
  X,
  Zap,
} from "lucide-react";
import { useLanguage } from "../../lib/i18n";
import { toast } from "sonner";
import { useRiderContext } from "../../context/RiderContext";
import { triggerHaptic } from "../../lib/captain-audio";
import { CaptainSupportModal } from "../support/CaptainSupportModal";
import { CaptainGuidelinesModal } from "../support/CaptainGuidelinesModal";

import { formatCaptainId } from "../../lib/format-ids";

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

  const [showSupportModal, setShowSupportModal] = useState(false);
  const [showGuidelinesModal, setShowGuidelinesModal] = useState(false);

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
                    ID: {formatCaptainId(captainId)}
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

          {/* 2. Scrollable Middle Body (Navigation List) */}
          <div className="flex-1 overflow-y-auto overscroll-contain">

            {/* Navigation List */}
            <div className="p-3 space-y-1">
              {[
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
                  icon: BarChart3,
                  title: "Performance & Analytics",
                  sub: "Live trips, KM, ratings & earnings summary",
                  onClick: () => {
                    onClose();
                    navigate({ to: "/analytics" });
                  },
                },
                {
                  icon: History,
                  title: t("history.title", "Order & Trip History"),
                  sub: t("history.summary", "Delivered trips, OTP logs & payout receipts"),
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
                  icon: ShieldCheck,
                  title: t("profile.guidelines", "Captain Guidelines & SOP"),
                  onClick: () => {
                    onClose();
                    navigate({ to: "/guidelines" });
                  },
                },
                {
                  icon: HelpCircle,
                  title: t("profile.support", "24/7 Captain Support & SOS"),
                  onClick: () => {
                    onClose();
                    navigate({ to: "/support" });
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
                  <span>{t("common.language", "Language")} ({selectedLanguageObj.nativeName})</span>
                </span>
                <span className="text-[11px] font-black text-emerald-600">{t("common.change", "Change")}</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleLogoutAction}
              className="w-full flex items-center justify-center gap-2 py-2 text-xs font-bold text-red-600 hover:bg-red-50 rounded-xl transition-colors active:scale-98"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>{t("profile.logout", "Logout Captain Account")}</span>
            </button>
          </div>
        </div>

        {/* Backdrop tap to close */}
        <div className="flex-1" onClick={onClose} />
      </div>



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


    </>
  );
};
