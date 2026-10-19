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
  Layers,
  LogOut,
  MapPin,
  ShieldCheck,
  TrendingUp,
  Volume2,
  X,
  Zap,
} from "lucide-react";
import { useLanguage } from "../../lib/i18n";
import { toast } from "sonner";
import { useRiderContext } from "../../context/RiderContext";
import { triggerHaptic, testCaptainAlertSound } from "../../lib/captain-audio";
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
  captainId = "",
  captainPhoto,
  rating,
  onLogout,
  onOpenLanguage,
  onOpenOnboarding,
}) => {
  const navigate = useNavigate();
  const { signOut, session } = useRiderContext();
  const { t, selectedLanguageObj } = useLanguage();

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
        {/* Drawer Container (Wallet Screen Theme) */}
        <div
          onClick={(e) => e.stopPropagation()}
          className="relative flex flex-col w-[86vw] max-w-[340px] h-[100dvh] bg-[#F4F5F7] text-zinc-900 shadow-2xl rounded-r-3xl border-r border-zinc-200/90 overflow-hidden animate-in slide-in-from-left duration-300"
        >
          {/* 1. Header with Close Button & Profile Badge (Fixed with Safe Area Padding) */}
          <div
            className="px-4 pb-3.5 bg-white border-b border-zinc-200/80 shadow-2xs shrink-0"
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
                onClick={() => {
                  triggerHaptic(15);
                  onClose();
                }}
                className="flex items-center justify-center w-8 h-8 rounded-full bg-zinc-100 hover:bg-zinc-200 text-zinc-700 hover:text-zinc-950 active:scale-90 transition-all cursor-pointer"
                aria-label="Close Drawer"
              >
                <X className="w-4 h-4 stroke-[2.5]" />
              </button>
            </div>

            {/* Profile Card (Matching Wallet Hero Card layout) */}
            <button
              type="button"
              onClick={handleOpenProfile}
              className="w-full flex items-center justify-between p-3.5 bg-gradient-to-br from-amber-50/90 via-white to-amber-50/40 hover:bg-amber-50 border border-amber-200/90 rounded-2xl text-left active:scale-98 transition-all shadow-2xs cursor-pointer"
            >
              <div className="flex items-center gap-3">
                {effectivePhoto ? (
                  <img
                    src={effectivePhoto}
                    alt={captainName}
                    className="w-12 h-12 rounded-full object-cover border-2 border-amber-300 shadow-xs shrink-0"
                  />
                ) : (
                  <div className="flex items-center justify-center w-12 h-12 rounded-full bg-[#FFC700] text-neutral-950 font-black text-lg shadow-xs shrink-0">
                    {captainName.slice(0, 1).toUpperCase()}
                  </div>
                )}
                <div className="min-w-0">
                  <h3 className="text-sm font-black text-zinc-950 leading-tight truncate">
                    {captainName || "Captain"}
                  </h3>
                  {captainId && formatCaptainId(captainId) ? (
                    <p className="text-[11px] font-bold text-zinc-500 mt-0.5 font-mono">
                      ID: {formatCaptainId(captainId)}
                    </p>
                  ) : null}
                  <div className="flex items-center gap-1.5 mt-1">
                    {session?.isVerified ? (
                      <span className="text-[10px] font-black text-emerald-800 bg-emerald-100/90 border border-emerald-200 px-2 py-0.5 rounded-full">
                        {rating && rating > 0 ? `${rating.toFixed(1)} ★ ` : ""}Verified Captain
                      </span>
                    ) : (
                      <span className="text-[10px] font-black text-amber-900 bg-amber-100 border border-amber-200 px-2 py-0.5 rounded-full">
                        Under Verification
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-zinc-400 shrink-0" />
            </button>
          </div>

          {/* 2. Scrollable Middle Body (Grouped Wallet-Themed Cards) */}
          <div className="flex-1 overflow-y-auto overscroll-contain p-3.5 space-y-3.5">
            {/* Group 1: Earnings & Performance */}
            <div className="bg-white rounded-2xl border border-zinc-200/90 shadow-2xs overflow-hidden">
              <div className="px-3.5 pt-2.5 pb-1">
                <span className="text-[10px] font-black text-zinc-400 uppercase tracking-wider">
                  Operational Dashboard
                </span>
              </div>

              {[
                {
                  icon: BarChart3,
                  iconBg: "bg-emerald-50 text-emerald-700 border-emerald-200",
                  title: "Performance & Analytics",
                  sub: "Live trips, KM, ratings & earnings summary",
                  onClick: () => {
                    triggerHaptic(15);
                    onClose();
                    navigate({ to: "/analytics" });
                  },
                },
                {
                  icon: History,
                  iconBg: "bg-blue-50 text-blue-700 border-blue-200",
                  title: t("history.title", "Order & Trip History"),
                  sub: t("history.summary", "Completed delivery receipts & summary"),
                  onClick: () => {
                    triggerHaptic(15);
                    onClose();
                    navigate({ to: "/history" });
                  },
                },
                {
                  icon: Award,
                  iconBg: "bg-amber-50 text-amber-700 border-amber-200",
                  title: t("leaderboard.title", "City Leaderboard"),
                  sub: "Rank #1 wins ₹500 Weekly Prize Pool",
                  onClick: () => {
                    triggerHaptic(15);
                    onClose();
                    navigate({ to: "/leaderboard" });
                  },
                },
                {
                  icon: TrendingUp,
                  iconBg: "bg-purple-50 text-purple-700 border-purple-200",
                  title: t("incentives.title", "Incentives & Targets"),
                  sub: "Daily milestone bonus tracker & quests",
                  onClick: () => {
                    triggerHaptic(15);
                    onClose();
                    navigate({ to: "/incentives" });
                  },
                },
              ].map((item, idx) => {
                const Icon = item.icon;
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={item.onClick}
                    className={`w-full flex items-center justify-between p-3 hover:bg-zinc-50 text-left active:scale-98 transition-all cursor-pointer ${
                      idx !== 0 ? "border-t border-zinc-100" : ""
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`flex items-center justify-center w-8 h-8 rounded-xl border shrink-0 ${item.iconBg}`}
                      >
                        <Icon className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-xs font-black text-zinc-950 leading-tight">
                          {item.title}
                        </h4>
                        <p className="text-[10px] text-zinc-500 font-medium line-clamp-1">
                          {item.sub}
                        </p>
                      </div>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-zinc-300 shrink-0" />
                  </button>
                );
              })}
            </div>

            {/* Group 2: Safety & Support */}
            <div className="bg-white rounded-2xl border border-zinc-200/90 shadow-2xs overflow-hidden">
              <div className="px-3.5 pt-2.5 pb-1">
                <span className="text-[10px] font-black text-zinc-400 uppercase tracking-wider">
                  Support & Standards
                </span>
              </div>

              {[
                {
                  icon: ShieldCheck,
                  iconBg: "bg-teal-50 text-teal-700 border-teal-200",
                  title: t("profile.guidelines", "Captain Guidelines & SOP"),
                  sub: "Zero commission rules & service quality",
                  onClick: () => {
                    triggerHaptic(15);
                    onClose();
                    navigate({ to: "/guidelines" });
                  },
                },
                {
                  icon: HelpCircle,
                  iconBg: "bg-rose-50 text-rose-700 border-rose-200",
                  title: t("profile.support", "24/7 Captain Support & SOS"),
                  sub: "Direct helpline assistance & emergency SOS",
                  onClick: () => {
                    triggerHaptic(15);
                    onClose();
                    navigate({ to: "/help" });
                  },
                },
              ].map((item, idx) => {
                const Icon = item.icon;
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={item.onClick}
                    className={`w-full flex items-center justify-between p-3 hover:bg-zinc-50 text-left active:scale-98 transition-all cursor-pointer ${
                      idx !== 0 ? "border-t border-zinc-100" : ""
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`flex items-center justify-center w-8 h-8 rounded-xl border shrink-0 ${item.iconBg}`}
                      >
                        <Icon className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-xs font-black text-zinc-950 leading-tight">
                          {item.title}
                        </h4>
                        <p className="text-[10px] text-zinc-500 font-medium line-clamp-1">
                          {item.sub}
                        </p>
                      </div>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-zinc-300 shrink-0" />
                  </button>
                );
              })}
            </div>
          </div>

          {/* 3. Language Switcher & Logout Footer (Fixed with Safe Area Bottom Padding) */}
          <div
            className="shrink-0 border-t border-zinc-200/90 bg-white shadow-xs space-y-2 p-3.5"
            style={{
              paddingBottom: "max(env(safe-area-inset-bottom, 0px) + 14px, 22px)",
            }}
          >
            {onOpenLanguage && (
              <button
                type="button"
                onClick={() => {
                  triggerHaptic(15);
                  onOpenLanguage();
                }}
                className="w-full flex items-center justify-between p-2.5 bg-[#F8F9FA] hover:bg-zinc-100 border border-zinc-200/90 rounded-xl text-xs font-bold text-zinc-800 shadow-2xs active:scale-98 transition-all cursor-pointer"
              >
                <span className="flex items-center gap-2">
                  <span>🌐</span>
                  <span>{t("common.language", "Language")} ({selectedLanguageObj.nativeName})</span>
                </span>
                <span className="text-[11px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                  {t("common.change", "Change")}
                </span>
              </button>
            )}

            <button
              type="button"
              onClick={handleLogoutAction}
              className="w-full flex items-center justify-center gap-2 py-2.5 text-xs font-bold text-red-600 hover:bg-red-50 rounded-xl transition-colors active:scale-98 cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>{t("profile.logout", "Logout Captain Account")}</span>
            </button>
          </div>
        </div>

        {/* Backdrop tap to close */}
        <div className="flex-1" onClick={onClose} />
      </div>



      {/* Guidelines & SOP Modal */}
      <CaptainGuidelinesModal
        isOpen={showGuidelinesModal}
        onClose={() => setShowGuidelinesModal(false)}
      />


    </>
  );
};
