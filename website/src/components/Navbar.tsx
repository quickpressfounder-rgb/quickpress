import React from "react";
import logoLight from "@/assets/quickpress-logo.png";
import logoDark from "@/assets/quickpress-logo-dark.png";
import { PageType, ModalType } from "@/types";

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

export function Navbar({
  currentPage,
  onNavigate,
  onOpenModal,
}: {
  currentPage: PageType;
  onNavigate: (page: PageType) => void;
  onOpenModal: (type: ModalType) => void;
}) {
  return (
    <nav className="fixed top-0 left-0 right-0 z-40 bg-transparent py-4 sm:py-6 transition-all duration-300 pointer-events-none">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between pointer-events-auto">
        {/* Brand Logo Only - Clean & Transparent */}
        <div className="py-1">
          <Logo onClick={() => onNavigate("home")} />
        </div>
      </div>
    </nav>
  );
}
