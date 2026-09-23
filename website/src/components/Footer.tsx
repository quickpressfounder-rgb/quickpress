import React from "react";
import { PageType, ModalType } from "@/types";
import { Logo } from "./Navbar";
import {
  IconMail,
  IconInstagram,
  IconFacebook,
  IconLinkedIn,
  IconTwitter,
} from "./Icons";

export function Footer({
  onNavigate,
  onOpenModal,
}: {
  onNavigate: (page: PageType) => void;
  onOpenModal: (type: ModalType) => void;
}) {
  return (
    <footer className="pt-16 pb-12 bg-[#07160D] text-white border-t border-emerald-950">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-10 mb-12">
          {/* Brand & Corporate Info */}
          <div className="col-span-2 md:col-span-2 space-y-4 pr-0 md:pr-6">
            <Logo size="md" dark={true} onClick={() => onNavigate("home")} />
            <p className="text-white text-xs sm:text-sm leading-relaxed max-w-sm">
              <strong className="text-white">SHRI KRISHNA EVS</strong><br />
              <span className="text-[11px] text-white/80 block">Legal Name / Proprietor: SAROJ KUMARI</span>
              <span className="text-[11px] text-white/80 block">
                Helpline: <a href="tel:+918279538461" className="underline hover:text-emerald-300">+91 8279538461</a> • <a href="mailto:official.quickpress@gmail.com" className="underline hover:text-emerald-300">official.quickpress@gmail.com</a>
              </span>
              Building connected on-demand services and smart delivery infrastructure. Built by friends, driven by ambition.
            </p>
            <div className="flex items-center gap-2.5 pt-2">
              {[
                {
                  name: "Instagram",
                  href: "https://instagram.com/quickpress",
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

          {/* Column 1: Company */}
          <div>
            <h5 className="text-xs font-black tracking-wider uppercase text-white mb-4">
              Company
            </h5>
            <ul className="space-y-2.5 text-xs text-white">
              <li>
                <button
                  onClick={() => onNavigate("about")}
                  className="text-white hover:text-emerald-300 transition-colors cursor-pointer text-left"
                >
                  About
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate("services")}
                  className="text-white hover:text-emerald-300 transition-colors cursor-pointer text-left"
                >
                  Services
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate("how-it-works")}
                  className="text-white hover:text-emerald-300 transition-colors cursor-pointer text-left"
                >
                  How It Works
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate("about")}
                  className="text-white hover:text-emerald-300 transition-colors cursor-pointer text-left"
                >
                  Careers
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate("contact")}
                  className="text-white hover:text-emerald-300 transition-colors cursor-pointer text-left"
                >
                  Contact
                </button>
              </li>
            </ul>
          </div>

          {/* Column 2: Legal */}
          <div>
            <h5 className="text-xs font-black tracking-wider uppercase text-white mb-4">
              Legal
            </h5>
            <ul className="space-y-2.5 text-xs text-white">
              <li>
                <button
                  onClick={() => onNavigate("privacy")}
                  className="text-white hover:text-emerald-300 transition-colors text-left cursor-pointer font-semibold"
                >
                  Privacy Policy
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate("terms")}
                  className="text-white hover:text-emerald-300 transition-colors text-left cursor-pointer font-semibold"
                >
                  Terms & Conditions
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate("terms")}
                  className="text-white hover:text-emerald-300 transition-colors text-left cursor-pointer"
                >
                  Cancellation & Refund Policy
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate("terms")}
                  className="text-white hover:text-emerald-300 transition-colors text-left cursor-pointer"
                >
                  Pickup & Delivery Policy
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate("privacy")}
                  className="text-white hover:text-emerald-300 transition-colors text-left cursor-pointer"
                >
                  Cookie Policy
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate("terms")}
                  className="text-white hover:text-emerald-300 transition-colors text-left cursor-pointer"
                >
                  Grievance Redressal
                </button>
              </li>
            </ul>
          </div>

          {/* Column 3: Support */}
          <div>
            <h5 className="text-xs font-black tracking-wider uppercase text-white mb-4">
              Support
            </h5>
            <ul className="space-y-2.5 text-xs text-white">
              <li>
                <button
                  onClick={() => onNavigate("contact")}
                  className="text-white hover:text-emerald-300 transition-colors text-left cursor-pointer"
                >
                  Help Center
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate("contact")}
                  className="text-white hover:text-emerald-300 transition-colors text-left cursor-pointer"
                >
                  Contact Support
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate("privacy")}
                  className="text-white hover:text-emerald-300 transition-colors text-left cursor-pointer"
                >
                  Privacy & Data Help
                </button>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Copyright Bar */}
        <div className="border-t border-emerald-900/60 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-white">
          <p className="text-white">© 2026 SHRI KRISHNA EVS (Proprietor: SAROJ KUMARI). All rights reserved.</p>
          <div className="flex items-center gap-4 text-[11px] text-white">
            <button onClick={() => onNavigate("privacy")} className="text-white hover:text-emerald-300 cursor-pointer">
              Privacy Policy
            </button>
            <span className="text-white/40">•</span>
            <button onClick={() => onNavigate("terms")} className="text-white hover:text-emerald-300 cursor-pointer">
              Terms
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
}
