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
  const pixelHeight = size === "sm" ? 28 : size === "lg" ? 40 : 34;

  return (
    <button
      onClick={onClick}
      className="inline-flex items-center select-none group focus:outline-none cursor-pointer text-left shrink-0"
      aria-label="QuickPress Homepage"
    >
      <img
        src={dark ? logoDark : logoLight}
        alt="QuickPress"
        style={{
          height: `${pixelHeight}px`,
          maxHeight: `${pixelHeight}px`,
          width: "auto",
          maxWidth: size === "sm" ? "140px" : size === "lg" ? "200px" : "175px",
        }}
        className="w-auto object-contain transition-transform group-hover:scale-105"
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
  // On homepage, top brand name is removed completely as requested
  if (currentPage === "home") {
    return null;
  }

  return (
    <nav className="fixed top-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md h-16 border-b border-gray-100 transition-all duration-300 flex items-center shadow-2xs">
      <div className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
        <Logo onClick={() => onNavigate("home")} />
        <button
          onClick={() => onNavigate("home")}
          className="text-xs font-bold text-emerald-800 hover:text-emerald-950 px-3.5 py-1.5 rounded-full bg-emerald-50 hover:bg-emerald-100 transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
        >
          <span>←</span>
          <span>Back to Home</span>
        </button>
      </div>
    </nav>
  );
}
