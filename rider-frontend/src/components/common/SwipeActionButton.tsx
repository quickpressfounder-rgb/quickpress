import React, { useRef, useState, useEffect } from "react";
import { ChevronRight, Check, Loader2 } from "lucide-react";

export interface SwipeActionButtonProps {
  label: string;
  onConfirm: () => void | Promise<void>;
  loading?: boolean;
  disabled?: boolean;
  color?: "emerald" | "blue" | "zinc" | "amber" | "purple";
  className?: string;
}

export function SwipeActionButton({
  label,
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
      trackBg: "bg-emerald-950/90 border-emerald-500/40",
      fillBg: "bg-gradient-to-r from-emerald-600 to-emerald-500",
      thumbBg: "bg-emerald-500 text-white shadow-emerald-500/50",
      text: "text-emerald-100",
    },
    blue: {
      trackBg: "bg-blue-950/90 border-blue-500/40",
      fillBg: "bg-gradient-to-r from-blue-600 to-blue-500",
      thumbBg: "bg-blue-500 text-white shadow-blue-500/50",
      text: "text-blue-100",
    },
    zinc: {
      trackBg: "bg-zinc-950/90 border-zinc-700/50",
      fillBg: "bg-gradient-to-r from-zinc-700 to-zinc-600",
      thumbBg: "bg-zinc-800 text-white shadow-black/50",
      text: "text-zinc-200",
    },
    amber: {
      trackBg: "bg-amber-950/90 border-amber-500/40",
      fillBg: "bg-gradient-to-r from-amber-600 to-amber-500",
      thumbBg: "bg-amber-500 text-white shadow-amber-500/50",
      text: "text-amber-100",
    },
    purple: {
      trackBg: "bg-purple-950/90 border-purple-500/40",
      fillBg: "bg-gradient-to-r from-purple-600 to-indigo-500",
      thumbBg: "bg-purple-500 text-white shadow-purple-500/50",
      text: "text-purple-100",
    },
  }[color];

  const handleStart = (clientX: number) => {
    if (disabled || loading || confirmed) return;
    setIsDragging(true);
  };

  const handleMove = (clientX: number) => {
    if (!isDragging || !containerRef.current || disabled || loading || confirmed) return;
    const rect = containerRef.current.getBoundingClientRect();
    const thumbWidth = 50;
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
          navigator.vibrate([40, 60, 40]);
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
      className={`relative h-14 w-full select-none overflow-hidden rounded-2xl border backdrop-blur-md transition-all shadow-lg ${colorStyles.trackBg} ${
        disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer active:scale-[0.99]"
      } ${className}`}
    >
      {/* Fill bar behind thumb */}
      <div
        style={{
          width: `calc(${dragProgress * 100}% + ${50 * (1 - dragProgress)}px)`,
          transition: isDragging ? "none" : "width 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)",
        }}
        className={`absolute inset-y-0 left-0 rounded-2xl ${colorStyles.fillBg} opacity-95`}
      />

      {/* Label text in center */}
      <div className="absolute inset-0 flex items-center justify-center px-12 pointer-events-none">
        <span
          style={{ opacity: 1 - dragProgress * 0.8 }}
          className={`text-xs sm:text-sm font-black tracking-wider uppercase transition-opacity flex items-center gap-2 ${colorStyles.text}`}
        >
          {loading ? (
            <Loader2 className="size-4.5 animate-spin inline" />
          ) : confirmed ? (
            <Check className="size-4.5 inline text-white stroke-[3]" />
          ) : null}
          <span>{loading ? "Processing..." : confirmed ? "Success!" : label}</span>
          {!loading && !confirmed && (
            <span className="inline-flex animate-pulse text-white/80 font-mono tracking-tighter">»»»</span>
          )}
        </span>
      </div>

      {/* Draggable thumb pill */}
      <div
        style={{
          transform: `translateX(calc(${dragProgress} * (100% - 48px)))`,
          transition: isDragging ? "none" : "transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)",
        }}
        className={`absolute top-1 left-1 bottom-1 w-12 rounded-xl flex items-center justify-center shadow-md transition-transform ${colorStyles.thumbBg}`}
      >
        {loading ? (
          <Loader2 className="size-5 animate-spin" />
        ) : confirmed ? (
          <Check className="size-5 stroke-[3]" />
        ) : (
          <ChevronRight className="size-6 translate-x-0.5 stroke-[2.5]" />
        )}
      </div>
    </div>
  );
}
