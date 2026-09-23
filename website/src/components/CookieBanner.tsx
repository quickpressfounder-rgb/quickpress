import React, { useState, useEffect } from "react";
import { PageType } from "@/types";
import { IconCookie, IconClose } from "@/components/Icons";

export function CookieBanner({ onNavigate }: { onNavigate: (page: PageType) => void }) {
  const [isVisible, setIsVisible] = useState(false);
  const [showPreferences, setShowPreferences] = useState(false);
  const [preferences, setPreferences] = useState({
    essential: true, // always true
    functional: true,
    analytics: false,
  });

  useEffect(() => {
    const consent = localStorage.getItem("quickpress_cookie_consent");
    if (!consent) {
      setIsVisible(true);
    }
  }, []);

  const handleAcceptAll = () => {
    localStorage.setItem(
      "quickpress_cookie_consent",
      JSON.stringify({ essential: true, functional: true, analytics: true, timestamp: new Date().toISOString() })
    );
    setIsVisible(false);
  };

  const handleRejectNonEssential = () => {
    localStorage.setItem(
      "quickpress_cookie_consent",
      JSON.stringify({ essential: true, functional: false, analytics: false, timestamp: new Date().toISOString() })
    );
    setIsVisible(false);
  };

  const handleSavePreferences = () => {
    localStorage.setItem(
      "quickpress_cookie_consent",
      JSON.stringify({ ...preferences, essential: true, timestamp: new Date().toISOString() })
    );
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-6 md:max-w-xl z-50 animate-slide-up">
      <div className="bg-white text-gray-900 p-5 sm:p-6 rounded-3xl border-2 border-emerald-100 shadow-2xl backdrop-blur-xl">
        <div className="flex items-start justify-between gap-3 mb-2">
          <div className="flex items-center gap-2.5">
            <IconCookie className="w-5 h-5 text-emerald-600" />
            <h3 className="text-sm sm:text-base font-black text-gray-950 tracking-tight">
              We use cookies
            </h3>
          </div>
          <button
            onClick={() => setIsVisible(false)}
            className="text-gray-400 hover:text-gray-700 text-xs p-1 cursor-pointer"
            aria-label="Dismiss cookie notice"
          >
            <IconClose className="w-4 h-4" />
          </button>
        </div>

        <p className="text-xs text-gray-600 leading-relaxed mb-4">
          QuickPress uses cookies and similar technologies to operate the website, remember preferences, understand usage and improve your experience.
        </p>

        {showPreferences && (
          <div className="p-3 mb-4 rounded-xl bg-gray-50 border border-gray-200 text-xs space-y-2 text-gray-700">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-gray-950">Essential Cookies (Required)</span>
              <span className="text-[10px] text-emerald-700 font-bold">Always Active</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Functional & Preferences</span>
              <input
                type="checkbox"
                checked={preferences.functional}
                onChange={(e) => setPreferences({ ...preferences, functional: e.target.checked })}
                className="accent-emerald-600 rounded"
              />
            </div>
            <div className="flex items-center justify-between">
              <span>Anonymous Usage Analytics</span>
              <input
                type="checkbox"
                checked={preferences.analytics}
                onChange={(e) => setPreferences({ ...preferences, analytics: e.target.checked })}
                className="accent-emerald-600 rounded"
              />
            </div>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2 mb-3">
          <button
            onClick={handleAcceptAll}
            className="px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-black transition-all cursor-pointer shadow-sm"
          >
            Accept All
          </button>
          {!showPreferences ? (
            <button
              onClick={() => setShowPreferences(true)}
              className="px-3 py-2 rounded-xl border border-gray-300 hover:bg-gray-100 text-gray-700 text-xs font-bold transition-all cursor-pointer"
            >
              Manage Preferences
            </button>
          ) : (
            <button
              onClick={handleSavePreferences}
              className="px-3 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold transition-all cursor-pointer"
            >
              Save Preferences
            </button>
          )}
          <button
            onClick={handleRejectNonEssential}
            className="px-3 py-2 rounded-xl text-gray-500 hover:text-gray-900 text-xs font-medium transition-all cursor-pointer"
          >
            Reject Non-Essential
          </button>
        </div>

        <div className="flex items-center gap-2 text-[11px] text-gray-500 border-t border-gray-100 pt-2.5">
          <button
            onClick={() => onNavigate("privacy")}
            className="hover:text-emerald-700 underline cursor-pointer"
          >
            Privacy Policy
          </button>
          <span>•</span>
          <button
            onClick={() => onNavigate("terms")}
            className="hover:text-emerald-700 underline cursor-pointer"
          >
            Terms of Service
          </button>
        </div>
      </div>
    </div>
  );
}
