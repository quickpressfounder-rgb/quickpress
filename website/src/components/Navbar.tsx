import React, { useState, useEffect } from "react";
import logoLight from "@/assets/quickpress-logo.png";
import logoDark from "@/assets/quickpress-logo-dark.png";
import { PageType, ModalType } from "@/types";
import { IconArrowRight, IconClose } from "./Icons";
import { handleGetStartedRedirect } from "@/utils/storeRedirect";

const GREEN = "#1A7A3C";

export function Logo({
  size = "md",
  dark = false,
  onClick,
}: {
  size?: "sm" | "md" | "lg";
  dark?: boolean;
  onClick?: () => void;
}) {
  const heightClass =
    size === "sm"
      ? "h-7 sm:h-8"
      : size === "lg"
      ? "h-10 sm:h-12"
      : "h-8 sm:h-9.5";

  return (
    <button
      onClick={onClick}
      className="inline-flex items-center select-none group focus:outline-none cursor-pointer text-left"
      aria-label="QuickPress Homepage"
    >
      <img
        src={dark ? logoDark : logoLight}
        alt="QuickPress"
        className={`${heightClass} w-auto object-contain transition-transform group-hover:scale-105`}
      />
    </button>
  );
}

const NAV_ITEMS: { label: string; page: PageType; badge?: string }[] = [
  { label: "Home", page: "home" },
  { label: "About", page: "about" },
  { label: "Services", page: "services" },
  { label: "How It Works", page: "how-it-works" },
  { label: "Partners", page: "partners" },
  { label: "Ecosystem", page: "ecosystem" },
];

export function Navbar({
  currentPage,
  onNavigate,
  onOpenModal,
}: {
  currentPage: PageType;
  onNavigate: (page: PageType) => void;
  onOpenModal: (type: ModalType) => void;
}) {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleLinkClick = (page: PageType) => {
    onNavigate(page);
    setMobileOpen(false);
  };

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-40 transition-all duration-300 ${
        scrolled
          ? "bg-white/95 backdrop-blur-md shadow-[0_4px_24px_rgba(0,0,0,0.06)] py-3.5 border-b border-gray-100"
          : "bg-white/90 backdrop-blur-sm py-4 sm:py-5 border-b border-gray-100/60"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
        {/* Logo */}
        <Logo onClick={() => handleLinkClick("home")} />

        {/* Center Nav Links (Desktop) */}
        <div className="hidden lg:flex items-center gap-1 xl:gap-2">
          {NAV_ITEMS.map((item) => {
            const isActive = currentPage === item.page;
            return (
              <button
                key={item.page}
                onClick={() => handleLinkClick(item.page)}
                className={`px-3.5 py-1.5 rounded-full text-sm font-semibold transition-all relative cursor-pointer flex items-center gap-1.5 ${
                  isActive
                    ? "text-emerald-950 font-bold bg-emerald-50/90 shadow-xs"
                    : "text-gray-600 hover:text-gray-950 hover:bg-gray-50"
                }`}
              >
                <span>{item.label}</span>
                {item.badge && (
                  <span className="px-1.5 py-0.2 text-[9px] font-extrabold rounded-full bg-emerald-100 text-emerald-800 uppercase tracking-wider">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Right CTA Actions */}
        <div className="hidden lg:flex items-center gap-3">
          <button
            onClick={() => handleLinkClick("contact")}
            className="px-4 py-2 text-sm font-semibold text-gray-700 hover:text-gray-950 hover:bg-gray-100/80 rounded-full transition-all cursor-pointer"
          >
            Contact Us
          </button>
          <button
            onClick={handleGetStartedRedirect}
            className="px-5 py-2.5 rounded-full text-sm font-bold text-white transition-all shadow-md hover:shadow-lg hover:scale-105 active:scale-95 flex items-center gap-1.5 group cursor-pointer"
            style={{ background: GREEN }}
          >
            <span>Get Started</span>
            <IconArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
          </button>
        </div>

        {/* Mobile Hamburger Toggle */}
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="lg:hidden p-2 rounded-xl text-gray-700 hover:bg-gray-100 focus:outline-none transition-colors"
          aria-label="Toggle navigation"
        >
          {mobileOpen ? (
            <IconClose className="w-6 h-6" />
          ) : (
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          )}
        </button>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileOpen && (
        <div className="lg:hidden bg-white/98 backdrop-blur-xl border-b border-gray-200 px-5 pt-3 pb-6 shadow-2xl animate-fade-in space-y-1.5 mt-2">
          {NAV_ITEMS.map((item) => {
            const isActive = currentPage === item.page;
            return (
              <button
                key={item.page}
                onClick={() => handleLinkClick(item.page)}
                className={`w-full flex items-center justify-between py-2.5 px-3 rounded-xl text-sm font-semibold transition-colors text-left ${
                  isActive
                    ? "bg-emerald-50 text-emerald-950 font-bold"
                    : "text-gray-700 hover:bg-gray-50"
                }`}
              >
                <span>{item.label}</span>
                {item.badge && (
                  <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-100 text-emerald-800">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
          <div className="pt-3 border-t border-gray-100 grid grid-cols-2 gap-2.5">
            <button
              onClick={() => handleLinkClick("contact")}
              className="w-full py-2.5 text-center text-sm font-semibold text-gray-700 bg-gray-100 rounded-xl cursor-pointer"
            >
              Contact Us
            </button>
            <button
              onClick={(e) => {
                setMobileOpen(false);
                handleGetStartedRedirect(e);
              }}
              className="w-full py-2.5 text-center text-sm font-bold text-white rounded-xl shadow-md cursor-pointer"
              style={{ background: GREEN }}
            >
              Get Started
            </button>
          </div>
        </div>
      )}
    </nav>
  );
}
