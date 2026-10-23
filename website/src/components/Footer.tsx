import React from "react";
import { PageType, ModalType } from "@/types";
import { Logo } from "./Navbar";
import {
  IconMail,
  IconInstagram,
  IconFacebook,
  IconLinkedIn,
  IconTwitter,
  IconSmartphone,
  IconStore,
  IconVan,
  IconArrowRight,
} from "./Icons";

export function Footer({
  onNavigate,
  onOpenModal,
}: {
  onNavigate: (page: PageType) => void;
  onOpenModal: (type: ModalType) => void;
}) {
  return (
    <footer className="pt-16 pb-12 bg-[#07160D] text-white border-t border-emerald-950 font-sans">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-5 gap-8 sm:gap-10 mb-12">
          {/* Brand & Corporate Info (Spans 2 columns on desktop) */}
          <div className="col-span-2 space-y-4 pr-0 lg:pr-6">
            <Logo size="md" dark={true} onClick={() => onNavigate("home")} />
            <p className="text-white text-xs sm:text-sm leading-relaxed max-w-sm">
              <strong className="text-white font-bold">QUICKPRESS TECHNOLOGIES PRIVATE LIMITED</strong><br />
              <span className="text-[11px] text-white/80 block mt-1">CIN: U96010UW2026PTC259787</span>
              <span className="text-[11px] text-white/80 block">
                Regd. Office: C/O DHANI RAM, Jail Road Nagla Baini, Kasganj, Etah- 207123, Uttar Pradesh
              </span>
              <span className="text-[11px] text-white/80 block mt-1">
                Helpline: <a href="tel:+918279538461" className="underline hover:text-emerald-300 font-semibold">+91 8279538461</a> • <a href="mailto:info@withquickpress.com" className="underline hover:text-emerald-300 font-semibold">info@withquickpress.com</a>
              </span>
              <span className="text-[11px] text-white/70 block mt-1">
                India's smart hyper-local on-demand laundry and garment care marketplace.
              </span>
            </p>

            <div className="flex items-center gap-2.5 pt-2">
              {[
                {
                  name: "Instagram",
                  href: "https://www.instagram.com/with.quickpress/",
                  icon: <IconInstagram className="w-4 h-4 text-white" />,
                },
                {
                  name: "Facebook",
                  href: "https://facebook.com/quickpress",
                  icon: <IconFacebook className="w-4 h-4 text-white" />,
                },
                {
                  name: "LinkedIn",
                  href: "https://linkedin.com/company/quickpress",
                  icon: <IconLinkedIn className="w-4 h-4 text-white" />,
                },
                {
                  name: "X",
                  href: "https://x.com/quickpress",
                  icon: <IconTwitter className="w-4 h-4 text-white" />,
                },
                {
                  name: "Email",
                  href: "mailto:official.quickpress@gmail.com",
                  icon: <IconMail className="w-4 h-4 text-white" />,
                },
              ].map((s) => (
                <a
                  key={s.name}
                  href={s.href}
                  target={s.href.startsWith("http") ? "_blank" : undefined}
                  rel={s.href.startsWith("http") ? "noopener noreferrer" : undefined}
                  className="w-9 h-9 rounded-full bg-emerald-950 border border-emerald-800/80 flex items-center justify-center text-white hover:bg-emerald-700 hover:border-emerald-600 transition-all cursor-pointer shadow-xs hover:scale-110"
                  aria-label={s.name}
                  title={s.name}
                >
                  {s.icon}
                </a>
              ))}
            </div>
          </div>

          {/* Column 1: Explore & Navigation (All Pages) */}
          <div>
            <h5 className="text-xs font-black tracking-wider uppercase text-emerald-400 mb-4">
              Explore Pages
            </h5>
            <ul className="space-y-2.5 text-xs text-white">
              <li>
                <button
                  onClick={() => onNavigate("home")}
                  className="text-white/90 hover:text-emerald-300 transition-colors cursor-pointer text-left font-medium"
                >
                  Home
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate("services")}
                  className="text-white/90 hover:text-emerald-300 transition-colors cursor-pointer text-left font-medium"
                >
                  All Services
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate("how-it-works")}
                  className="text-white/90 hover:text-emerald-300 transition-colors cursor-pointer text-left font-medium"
                >
                  How It Works
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate("partners")}
                  className="text-white/90 hover:text-emerald-300 transition-colors cursor-pointer text-left font-medium"
                >
                  Partner With Us
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate("ecosystem")}
                  className="text-white/90 hover:text-emerald-300 transition-colors cursor-pointer text-left font-medium"
                >
                  Ecosystem & Node Map
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate("about")}
                  className="text-white/90 hover:text-emerald-300 transition-colors cursor-pointer text-left font-medium"
                >
                  About Us & Story
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate("contact")}
                  className="text-white/90 hover:text-emerald-300 transition-colors cursor-pointer text-left font-medium"
                >
                  Contact Us
                </button>
              </li>
            </ul>
          </div>

          {/* Column 2: Our 3 Mobile Apps */}
          <div>
            <h5 className="text-xs font-black tracking-wider uppercase text-emerald-400 mb-4">
              Our 3 Apps
            </h5>
            <ul className="space-y-3 text-xs text-white">
              <li>
                <a
                  href="/apks/QuickPress-Customer.apk"
                  download="QuickPress-Customer.apk"
                  className="group flex items-start gap-2 text-white/90 hover:text-emerald-300 transition-colors"
                >
                  <IconSmartphone className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold block">Customer App</span>
                    <span className="text-[10px] text-white/60 block">Book laundry & track GPS</span>
                  </div>
                </a>
              </li>
              <li>
                <a
                  href="/apks/QuickPress-Partner.apk"
                  download="QuickPress-Partner.apk"
                  className="group flex items-start gap-2 text-white/90 hover:text-emerald-300 transition-colors"
                >
                  <IconStore className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold block">Partner Hub App</span>
                    <span className="text-[10px] text-white/60 block">Laundromat POS & orders</span>
                  </div>
                </a>
              </li>
              <li>
                <a
                  href="/apks/QuickPress-Captain.apk"
                  download="QuickPress-Captain.apk"
                  className="group flex items-start gap-2 text-white/90 hover:text-emerald-300 transition-colors"
                >
                  <IconVan className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold block">Captain Fleet App</span>
                    <span className="text-[10px] text-white/60 block">Delivery pickups & earnings</span>
                  </div>
                </a>
              </li>
            </ul>
          </div>

          {/* Column 3: Legal & Support */}
          <div>
            <h5 className="text-xs font-black tracking-wider uppercase text-emerald-400 mb-4">
              Legal & Support
            </h5>
            <ul className="space-y-2.5 text-xs text-white">
              <li>
                <button
                  onClick={() => onNavigate("privacy")}
                  className="text-white/90 hover:text-emerald-300 transition-colors text-left cursor-pointer font-medium"
                >
                  Privacy Policy
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate("terms")}
                  className="text-white/90 hover:text-emerald-300 transition-colors text-left cursor-pointer font-medium"
                >
                  Terms & Conditions
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate("terms")}
                  className="text-white/90 hover:text-emerald-300 transition-colors text-left cursor-pointer"
                >
                  Cancellation & Refund
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate("terms")}
                  className="text-white/90 hover:text-emerald-300 transition-colors text-left cursor-pointer"
                >
                  Pickup & Delivery Policy
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate("privacy")}
                  className="text-white/90 hover:text-emerald-300 transition-colors text-left cursor-pointer"
                >
                  Cookie Policy
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate("contact")}
                  className="text-white/90 hover:text-emerald-300 transition-colors text-left cursor-pointer"
                >
                  Help Center & Support
                </button>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Copyright Bar */}
        <div className="border-t border-emerald-900/60 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-white">
          <p className="text-white/80">© 2026 QUICKPRESS TECHNOLOGIES PRIVATE LIMITED (CIN: U96010UW2026PTC259787). All rights reserved.</p>
          <div className="flex items-center gap-4 text-[11px] text-white/80">
            <button onClick={() => onNavigate("privacy")} className="text-white/80 hover:text-emerald-300 cursor-pointer">
              Privacy Policy
            </button>
            <span className="text-white/40">•</span>
            <button onClick={() => onNavigate("terms")} className="text-white/80 hover:text-emerald-300 cursor-pointer">
              Terms & Conditions
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
}
