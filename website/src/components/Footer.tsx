import React from "react";
import { PageType, ModalType } from "@/types";
import {
  IconInstagram,
  IconFacebook,
  IconLinkedIn,
  IconTwitter,
  IconYouTube,
  IconApple,
  IconGooglePlay,
} from "./Icons";
import { handleGetStartedRedirect } from "@/utils/storeRedirect";

export function Footer({
  onNavigate,
  onOpenModal,
}: {
  onNavigate: (page: PageType) => void;
  onOpenModal: (type: ModalType) => void;
}) {
  return (
    <footer className="pt-16 pb-12 bg-black text-white font-sans border-t border-zinc-900 select-none">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* ─── Top Brand Logo (Exact Image Styling: White Quick + Green Press) ─── */}
        <div className="mb-10 text-left">
          <button
            type="button"
            onClick={() => onNavigate("home")}
            className="text-4xl sm:text-5xl font-black italic tracking-tight hover:scale-105 transition-transform cursor-pointer inline-flex items-center"
          >
            <span className="text-white">Quick</span>
            <span className="text-[#22c55e]">Press</span>
          </button>
        </div>

        {/* ─── 4-Column Grid ─── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 sm:gap-10 mb-12 text-left">
          {/* Column 1: About QuickPress / Company */}
          <div className="space-y-3">
            <h5 className="text-xs sm:text-sm font-black tracking-wider uppercase text-white mb-4">
              About QuickPress
            </h5>
            <ul className="space-y-2.5 text-xs sm:text-sm text-zinc-400">
              <li>
                <button
                  type="button"
                  onClick={() => onNavigate("who-we-are")}
                  className="hover:text-white transition-colors cursor-pointer text-left font-medium block"
                >
                  Who We Are
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onNavigate("blog")}
                  className="hover:text-white transition-colors cursor-pointer text-left font-medium block"
                >
                  Blog &amp; Stories
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onNavigate("careers")}
                  className="hover:text-white transition-colors cursor-pointer text-left font-medium block"
                >
                  Work With Us (Careers)
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onNavigate("investor-relations")}
                  className="hover:text-white transition-colors cursor-pointer text-left font-medium block"
                >
                  Investor Relations
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onNavigate("report-fraud")}
                  className="hover:text-red-400 transition-colors cursor-pointer text-left font-medium block text-red-500/90"
                >
                  Report Fraud
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onNavigate("about")}
                  className="hover:text-white transition-colors cursor-pointer text-left font-medium block"
                >
                  Founder Story &amp; Origin
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onNavigate("contact")}
                  className="hover:text-white transition-colors cursor-pointer text-left font-medium block"
                >
                  Contact Us
                </button>
              </li>
            </ul>
          </div>

          {/* Column 2: Core Laundry Verticals */}
          <div className="space-y-3">
            <h5 className="text-xs sm:text-sm font-black tracking-wider uppercase text-white mb-4">
              Core Services
            </h5>
            <ul className="space-y-2 text-xs text-zinc-400">
              <li>
                <button
                  type="button"
                  onClick={() => onOpenModal("booking")}
                  className="hover:text-white transition-colors cursor-pointer text-left block"
                >
                  Doorstep Wash &amp; Fold
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onOpenModal("booking")}
                  className="hover:text-white transition-colors cursor-pointer text-left block"
                >
                  Italian Steam Ironing
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onOpenModal("booking")}
                  className="hover:text-white transition-colors cursor-pointer text-left block"
                >
                  Premium Hydrocarbon Dry Clean
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onOpenModal("booking")}
                  className="hover:text-white transition-colors cursor-pointer text-left block"
                >
                  Sneaker &amp; Shoe Care Spa
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onOpenModal("booking")}
                  className="hover:text-white transition-colors cursor-pointer text-left block"
                >
                  Blankets &amp; Heavy Linen
                </button>
              </li>
              <li className="pt-2">
                <button
                  type="button"
                  onClick={() => onNavigate("b2b-partner")}
                  className="hover:text-white transition-colors cursor-pointer text-left font-semibold text-zinc-300 block"
                >
                  Commercial B2B Laundry
                </button>
              </li>
            </ul>
          </div>

          {/* Column 3: Learn More & Legal Policies */}
          <div className="space-y-3">
            <h5 className="text-xs sm:text-sm font-black tracking-wider uppercase text-white mb-4">
              Legal & Compliance
            </h5>
            <ul className="space-y-2.5 text-xs sm:text-sm text-zinc-400">
              <li>
                <button
                  type="button"
                  onClick={() => onNavigate("privacy")}
                  className="hover:text-white transition-colors cursor-pointer text-left font-medium"
                >
                  Privacy Policy (DPDP)
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => {
                    if (typeof window !== "undefined") window.location.hash = "#terms";
                    onNavigate("terms");
                  }}
                  className="hover:text-white transition-colors cursor-pointer text-left font-medium"
                >
                  Terms of Service
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => {
                    if (typeof window !== "undefined") window.location.hash = "#refund";
                    onNavigate("terms");
                  }}
                  className="hover:text-white transition-colors cursor-pointer text-left font-medium"
                >
                  Cancellation & Refund
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => {
                    if (typeof window !== "undefined") window.location.hash = "#garment-care";
                    onNavigate("terms");
                  }}
                  className="hover:text-white transition-colors cursor-pointer text-left font-medium"
                >
                  Garment Care & Liability
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => {
                    if (typeof window !== "undefined") window.location.hash = "#pickup";
                    onNavigate("terms");
                  }}
                  className="hover:text-white transition-colors cursor-pointer text-left font-medium"
                >
                  Pickup & Delivery Policy
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => {
                    if (typeof window !== "undefined") window.location.hash = "#cookie";
                    onNavigate("terms");
                  }}
                  className="hover:text-white transition-colors cursor-pointer text-left font-medium"
                >
                  Cookie & Tracking Policy
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => {
                    if (typeof window !== "undefined") window.location.hash = "#grievance";
                    onNavigate("terms");
                  }}
                  className="hover:text-white transition-colors cursor-pointer text-left font-medium text-zinc-300 font-semibold"
                >
                  Grievance & Nodal Desk
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onNavigate("contact")}
                  className="hover:text-white transition-colors cursor-pointer text-left font-medium"
                >
                  Help Center & Support
                </button>
              </li>
            </ul>
          </div>

          {/* Column 4: Social Links & App Download Buttons */}
          <div className="space-y-4 col-span-2 md:col-span-1">
            <h5 className="text-xs sm:text-sm font-black tracking-wider uppercase text-white mb-4">
              Social Links
            </h5>

            {/* Circular Social Icons in a Row (White Circles with Black Icons like Zomato) */}
            <div className="flex items-center gap-2 mb-6">
              {[
                {
                  name: "LinkedIn",
                  href: "https://linkedin.com/company/quickpress",
                  icon: <IconLinkedIn className="w-3.5 h-3.5 text-black" />,
                },
                {
                  name: "Instagram",
                  href: "https://www.instagram.com/with.quickpress",
                  icon: <IconInstagram className="w-3.5 h-3.5 text-black" />,
                },
                {
                  name: "YouTube",
                  href: "https://youtube.com/@quickpress",
                  icon: <IconYouTube className="w-3.5 h-3.5 text-black" />,
                },
                {
                  name: "Facebook",
                  href: "https://www.facebook.com/with.quickpress",
                  icon: <IconFacebook className="w-3.5 h-3.5 text-black" />,
                },
                {
                  name: "X",
                  href: "https://x.com/quickpress",
                  icon: <IconTwitter className="w-3.5 h-3.5 text-black" />,
                },
              ].map((s) => (
                <a
                  key={s.name}
                  href={s.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={s.name}
                  title={s.name}
                  className="w-7 h-7 rounded-full bg-white flex items-center justify-center hover:scale-110 hover:bg-black hover:text-white transition-all cursor-pointer shadow-xs border border-zinc-200"
                >
                  {s.icon}
                </a>
              ))}
            </div>

            {/* Zomato-Style App Store Buttons */}
            <div className="space-y-2.5 max-w-[170px]">
              {/* Apple App Store */}
              <button
                type="button"
                onClick={() => handleGetStartedRedirect()}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg bg-black text-white border border-zinc-700 hover:border-zinc-400 transition-all cursor-pointer group shadow-sm text-left"
              >
                <IconApple className="w-6 h-6 text-white shrink-0 group-hover:scale-105 transition-transform" />
                <div className="leading-tight">
                  <span className="text-[8px] uppercase tracking-wider text-zinc-400 block font-medium">
                    Download on the
                  </span>
                  <span className="text-xs font-black text-white block">
                    App Store
                  </span>
                </div>
              </button>

              {/* Google Play Store */}
              <button
                type="button"
                onClick={() => handleGetStartedRedirect()}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg bg-black text-white border border-zinc-700 hover:border-zinc-400 transition-all cursor-pointer group shadow-sm text-left"
              >
                <IconGooglePlay className="w-6 h-6 text-white shrink-0 group-hover:scale-105 transition-transform" />
                <div className="leading-tight">
                  <span className="text-[8px] uppercase tracking-wider text-zinc-400 block font-medium">
                    GET IT ON
                  </span>
                  <span className="text-xs font-black text-white block">
                    Google Play
                  </span>
                </div>
              </button>
            </div>
          </div>
        </div>

        {/* ─── Bottom Divider ─── */}
        <hr className="border-t border-zinc-900 my-8" />

        {/* ─── Disclaimer & Corporate Copyright ─── */}
        <div className="text-left space-y-2 text-[11px] text-zinc-500 leading-relaxed">
          <p>
            By continuing past this page, you agree to our Terms of Service, Cookie Policy, Privacy Policy and Content Policies. All trademarks are properties of their respective owners.
          </p>
          <p>
            2026 © <strong className="text-zinc-400 font-bold">QUICKPRESS TECHNOLOGIES PRIVATE LIMITED</strong> (CIN: U74999UP2024PTC198141). All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}

