import React, { useState, useRef, useEffect } from "react";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import { triggerHaptic } from "../../lib/captain-audio";

interface CaptainFloatingBubbleProps {
  isOnline: boolean;
  ordersCount?: number;
}

/**
 * Rapido Captain Floating Logo Bubble (Screenshot 5 Match).
 * Floats on screen when rider is ON DUTY (Online).
 * Tapping it immediately navigates to the Orders Tab (/orders).
 */
export const CaptainFloatingBubble: React.FC<CaptainFloatingBubbleProps> = ({
  isOnline,
  ordersCount = 0,
}) => {
  const navigate = useNavigate();
  const currentPath = useRouterState({ select: (s) => s.location.pathname });

  // Do not show bubble if already on /orders screen or if rider is offline
  if (!isOnline || currentPath === "/orders") {
    return null;
  }

  const [position, setPosition] = useState<{ x: number; y: number }>({ x: 16, y: 110 });
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef<{ startX: number; startY: number; posX: number; posY: number; hasMoved: boolean }>({
    startX: 0,
    startY: 0,
    posX: 16,
    posY: 110,
    hasMoved: false,
  });

  const handleTouchStart = (e: React.TouchEvent | React.MouseEvent) => {
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;

    dragRef.current = {
      startX: clientX,
      startY: clientY,
      posX: position.x,
      posY: position.y,
      hasMoved: false,
    };
    setIsDragging(true);
  };

  const handleTouchMove = (e: React.TouchEvent | React.MouseEvent) => {
    if (!isDragging) return;
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;

    const deltaX = clientX - dragRef.current.startX;
    const deltaY = clientY - dragRef.current.startY;

    if (Math.abs(deltaX) > 5 || Math.abs(deltaY) > 5) {
      dragRef.current.hasMoved = true;
    }

    const newX = Math.max(8, Math.min(window.innerWidth - 76, dragRef.current.posX + deltaX));
    const newY = Math.max(80, Math.min(window.innerHeight - 140, dragRef.current.posY + deltaY));

    setPosition({ x: newX, y: newY });
  };

  const handleTouchEnd = () => {
    setIsDragging(false);

    // If user tapped without dragging, trigger click action!
    if (!dragRef.current.hasMoved) {
      handleBubbleClick();
    } else {
      // Snap to Left or Right Edge (like Rapido / Messenger ChatHead)
      const screenMid = window.innerWidth / 2;
      setPosition((prev) => ({
        x: prev.x < screenMid ? 16 : window.innerWidth - 80,
        y: prev.y,
      }));
    }
  };

  const handleBubbleClick = () => {
    triggerHaptic([30, 60]);
    navigate({ to: "/orders" });
  };

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label="QuickPress Captain Orders Shortcut"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onMouseDown={handleTouchStart}
      onMouseMove={handleTouchMove}
      onMouseUp={handleTouchEnd}
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        touchAction: "none",
      }}
      className={`fixed z-50 flex flex-col items-center justify-center size-[68px] rounded-full bg-white border-3 border-[#FFC107] shadow-[0_12px_28px_rgba(0,0,0,0.22)] select-none cursor-pointer transition-transform active:scale-95 animate-in fade-in zoom-in-75 duration-200 ${
        isDragging ? "scale-105 shadow-2xl opacity-90" : ""
      }`}
    >
      {/* Pending Orders Count Badge (if any) */}
      {ordersCount > 0 && (
        <span className="absolute -top-1.5 -right-1.5 flex items-center justify-center size-6 rounded-full bg-red-600 text-white font-black text-[11px] border-2 border-white shadow-md animate-pulse">
          {ordersCount}
        </span>
      )}

      {/* Inner Yellow Pill: quickpress */}
      <div className="bg-[#FEF3C7] px-2 py-0.5 rounded-full border border-[#FDE68A]">
        <span className="text-[8px] font-black text-[#B45309] tracking-tighter uppercase leading-none block">
          quickpress
        </span>
      </div>

      {/* Title: Captain */}
      <span className="text-[11px] font-black text-black leading-tight mt-0.5 tracking-tight">
        Captain
      </span>

      {/* Pulsing Green Online Dot */}
      <div className="relative flex items-center justify-center mt-0.5">
        <span className="size-2 rounded-full bg-[#00C853] animate-ping absolute opacity-75" />
        <span className="size-1.5 rounded-full bg-[#00C853]" />
      </div>
    </div>
  );
};
