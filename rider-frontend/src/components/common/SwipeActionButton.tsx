import React, { useRef, useState, useEffect } from "react";
import { ChevronRight, Check, Loader2, Sparkles } from "lucide-react";

export interface SwipeActionButtonProps {
  label: string;
  hint?: string;
  onConfirm: () => void | Promise<void>;
  loading?: boolean;
  disabled?: boolean;
  color?: "emerald" | "blue" | "zinc" | "amber" | "purple" | "red";
  className?: string;
}

export function SwipeActionButton({
  label,
  hint,
  onConfirm,
  loading = false,
  disabled = false,
  color = "emerald",
  className = "",
}: SwipeActionButtonProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dragProgress, setDragProgress] = useState(0); // 0 to 1
  const [isDragging, setIsDragging] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  const colorStyles = {
    emerald: {
      trackBg: "bg-[#16A34A] border-[#15803D] shadow-md",
      fillBg: "bg-[#15803D]",
      thumbBg: "bg-white text-[#16A34A] shadow-md rounded-full",
      text: "text-white font-black",
      subtext: "text-emerald-100",
      glow: "shadow-md ring-2 ring-emerald-400/40",
    },
    blue: {
      trackBg: "bg-[#1D4ED8] border-[#1E40AF] shadow-md",
      fillBg: "bg-[#1E40AF]",
      thumbBg: "bg-white text-[#1D4ED8] shadow-md rounded-full",
      text: "text-white font-black",
      subtext: "text-blue-100",
      glow: "shadow-md ring-2 ring-blue-400/40",
    },
    red: {
      trackBg: "bg-[#DC2626] border-[#B91C1C] shadow-md",
      fillBg: "bg-[#B91C1C]",
      thumbBg: "bg-white text-[#DC2626] shadow-md rounded-full",
      text: "text-white font-black",
      subtext: "text-red-100",
      glow: "shadow-md ring-2 ring-red-400/40",
    },
    zinc: {
      trackBg: "bg-slate-100 border-slate-200 shadow-2xs",
      fillBg: "bg-slate-900",
      thumbBg: "bg-slate-950 text-white shadow-md border border-slate-900",
      text: "text-slate-900",
      subtext: "text-slate-500",
      glow: "shadow-md ring-2 ring-slate-900/20",
    },
    amber: {
      trackBg: "bg-amber-500 border-amber-600 shadow-md",
      fillBg: "bg-amber-600",
      thumbBg: "bg-white text-amber-600 shadow-md rounded-full",
      text: "text-white font-black",
      subtext: "text-amber-100",
      glow: "shadow-md ring-2 ring-amber-400/40",
    },
    purple: {
      trackBg: "bg-indigo-600 border-indigo-700 shadow-md",
      fillBg: "bg-indigo-700",
      thumbBg: "bg-white text-indigo-600 shadow-md rounded-full",
      text: "text-white font-black",
      subtext: "text-indigo-100",
      glow: "shadow-md ring-2 ring-indigo-400/40",
    },
  }[color];

  const handleStart = (clientX: number) => {
    if (disabled || loading || confirmed) return;
    setIsDragging(true);
  };

  const handleMove = (clientX: number) => {
    if (!isDragging || !containerRef.current || disabled || loading || confirmed) return;
    const rect = containerRef.current.getBoundingClientRect();
    const thumbWidth = 52;
    const maxDrag = rect.width - thumbWidth;
    const currentDrag = clientX - rect.left - thumbWidth / 2;
    const progress = Math.max(0, Math.min(1, currentDrag / maxDrag));
    setDragProgress(progress);
  };

  const handleEnd = async () => {
    if (!isDragging || disabled || loading || confirmed) return;
    setIsDragging(false);

    if (dragProgress >= 0.72) {
      setDragProgress(1);
      setConfirmed(true);
      try {
        if (typeof navigator !== "undefined" && navigator.vibrate) {
          navigator.vibrate([30, 50, 40]);
        }
      } catch {}
      await onConfirm();
      setTimeout(() => {
        setConfirmed(false);
        setDragProgress(0);
      }, 1200);
    } else {
      setDragProgress(0);
    }
  };

  // Touch event handlers
  const onTouchStart = (e: React.TouchEvent) => handleStart(e.touches[0].clientX);
  const onTouchMove = (e: React.TouchEvent) => handleMove(e.touches[0].clientX);
  const onTouchEnd = () => handleEnd();

  // Mouse event handlers
  const onMouseDown = (e: React.MouseEvent) => handleStart(e.clientX);
  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (isDragging) handleMove(e.clientX);
    };
    const onMouseUp = () => {
      if (isDragging) handleEnd();
    };

    if (isDragging) {
      window.addEventListener("mousemove", onMouseMove);
      window.addEventListener("mouseup", onMouseUp);
    }
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, [isDragging, dragProgress]);

  return (
    <div
      ref={containerRef}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      onMouseDown={onMouseDown}
      className={`relative h-[62px] w-full select-none overflow-hidden rounded-2xl border-2 backdrop-blur-xl transition-all shadow-xl ${colorStyles.trackBg} ${
        isDragging ? colorStyles.glow : ""
      } ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer active:scale-[0.99]"} ${className}`}
    >
      {/* Dynamic progress fill bar behind thumb */}
      <div
        style={{
          width: `calc(${dragProgress * 100}% + ${52 * (1 - dragProgress)}px)`,
          transition: isDragging ? "none" : "width 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)",
        }}
        className={`absolute inset-y-0 left-0 rounded-2xl ${colorStyles.fillBg} opacity-95`}
      />

      {/* Shimmer light reflection layer */}
      <div className="absolute inset-0 bg-gradient-to-b from-white/10 via-transparent to-black/20 pointer-events-none" />

      {/* Centered Action Label & Hint */}
      <div className="absolute inset-0 flex flex-col items-center justify-center px-14 pointer-events-none text-center">
        <span
          style={{ opacity: 1 - dragProgress * 0.85 }}
          className={`text-xs sm:text-[13px] font-black tracking-wider uppercase transition-opacity flex items-center justify-center gap-2 ${colorStyles.text}`}
        >
          {loading ? (
            <Loader2 className="size-4.5 animate-spin inline text-white" />
          ) : confirmed ? (
            <Check className="size-4.5 inline text-white stroke-[3.5]" />
          ) : null}
          <span className="truncate">{loading ? "Processing..." : confirmed ? "Confirmed!" : label}</span>
          {!loading && !confirmed && (
            <span className="inline-flex items-center text-slate-400 animate-pulse font-mono tracking-tighter">
              »»
            </span>
          )}
        </span>
        {hint && !loading && !confirmed && (
          <span
            style={{ opacity: 1 - dragProgress * 0.9 }}
            className={`text-[10px] font-bold tracking-normal transition-opacity truncate max-w-full ${colorStyles.subtext}`}
          >
            {hint}
          </span>
        )}
      </div>

      {/* Interactive Draggable Thumb */}
      <div
        style={{
          transform: `translateX(calc(${dragProgress} * (100% - 50px)))`,
          transition: isDragging ? "none" : "transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)",
        }}
        className={`absolute top-1.5 left-1.5 bottom-1.5 w-[50px] rounded-xl flex items-center justify-center shadow-lg transition-transform ${colorStyles.thumbBg}`}
      >
        {loading ? (
          <Loader2 className="size-5.5 animate-spin" />
        ) : confirmed ? (
          <Check className="size-6 stroke-[3.5]" />
        ) : (
          <div className="flex items-center justify-center relative">
            <ChevronRight className="size-6 translate-x-0.5 stroke-[3]" />
          </div>
        )}
      </div>
    </div>
  );
}

