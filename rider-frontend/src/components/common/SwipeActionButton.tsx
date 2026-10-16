import React, { useRef, useState, useEffect } from "react";
import { ChevronRight, Check, Loader2, Sparkles } from "lucide-react";

export interface SwipeActionButtonProps {
  label: string;
  hint?: string;
  onConfirm: () => void | Promise<void>;
  loading?: boolean;
  disabled?: boolean;
  color?: "emerald" | "blue" | "zinc" | "amber" | "purple";
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
      trackBg: "bg-slate-950/95 border-emerald-500/50 shadow-emerald-950/30",
      fillBg: "bg-gradient-to-r from-emerald-600 via-teal-500 to-emerald-400",
      thumbBg: "bg-gradient-to-br from-emerald-400 to-emerald-600 text-white shadow-emerald-500/40 border border-emerald-300/40",
      text: "text-emerald-50",
      subtext: "text-emerald-300/80",
      glow: "shadow-[0_0_20px_rgba(16,185,129,0.35)]",
    },
    blue: {
      trackBg: "bg-slate-950/95 border-blue-500/50 shadow-blue-950/30",
      fillBg: "bg-gradient-to-r from-blue-600 via-indigo-500 to-cyan-400",
      thumbBg: "bg-gradient-to-br from-blue-400 to-blue-600 text-white shadow-blue-500/40 border border-blue-300/40",
      text: "text-blue-50",
      subtext: "text-blue-300/80",
      glow: "shadow-[0_0_20px_rgba(59,130,246,0.35)]",
    },
    zinc: {
      trackBg: "bg-slate-950/95 border-zinc-700/60 shadow-black/40",
      fillBg: "bg-gradient-to-r from-zinc-700 via-zinc-600 to-zinc-500",
      thumbBg: "bg-gradient-to-br from-zinc-600 to-zinc-800 text-white shadow-black/50 border border-zinc-500/30",
      text: "text-zinc-100",
      subtext: "text-zinc-400",
      glow: "shadow-[0_0_20px_rgba(113,113,122,0.25)]",
    },
    amber: {
      trackBg: "bg-slate-950/95 border-amber-500/50 shadow-amber-950/30",
      fillBg: "bg-gradient-to-r from-amber-600 via-orange-500 to-amber-400",
      thumbBg: "bg-gradient-to-br from-amber-400 to-amber-600 text-white shadow-amber-500/40 border border-amber-300/40",
      text: "text-amber-50",
      subtext: "text-amber-300/80",
      glow: "shadow-[0_0_20px_rgba(245,158,11,0.35)]",
    },
    purple: {
      trackBg: "bg-slate-950/95 border-purple-500/50 shadow-purple-950/30",
      fillBg: "bg-gradient-to-r from-purple-600 via-fuchsia-500 to-indigo-400",
      thumbBg: "bg-gradient-to-br from-purple-400 to-purple-600 text-white shadow-purple-500/40 border border-purple-300/40",
      text: "text-purple-50",
      subtext: "text-purple-300/80",
      glow: "shadow-[0_0_20px_rgba(168,85,247,0.35)]",
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
            <span className="inline-flex items-center text-white/90 animate-pulse font-mono tracking-tighter">
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
          <Loader2 className="size-5.5 animate-spin text-white" />
        ) : confirmed ? (
          <Check className="size-6 stroke-[3.5] text-white" />
        ) : (
          <div className="flex items-center justify-center relative">
            <ChevronRight className="size-6 text-white translate-x-0.5 stroke-[3]" />
          </div>
        )}
      </div>
    </div>
  );
}

