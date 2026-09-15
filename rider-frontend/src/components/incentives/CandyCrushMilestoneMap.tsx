import React, { useState, useEffect, useRef } from "react";
import {
  Award,
  CheckCircle2,
  ChevronRight,
  Flame,
  Gift,
  Lock,
  PartyPopper,
  Sparkles,
  Star,
  Target,
  Trophy,
  X,
  Zap,
} from "lucide-react";
import type { CandyCrushLevel } from "../../api/rider/rider-incentives-api";
import { triggerHaptic } from "../../lib/captain-audio";

interface CandyCrushMilestoneMapProps {
  levels: CandyCrushLevel[];
  completedToday: number;
  onClaimLevel: (level: number) => Promise<void>;
  claimingLevel: number | null;
}

// Confetti Particle type for canvas celebration
interface ConfettiParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  rotation: number;
  vRotation: number;
  alpha: number;
}

export const CandyCrushMilestoneMap: React.FC<CandyCrushMilestoneMapProps> = ({
  levels,
  completedToday,
  onClaimLevel,
  claimingLevel,
}) => {
  const [selectedLevel, setSelectedLevel] = useState<CandyCrushLevel | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Trigger celebratory confetti animation
  useEffect(() => {
    if (!showConfetti) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const colors = ["#EC4899", "#F59E0B", "#10B981", "#3B82F6", "#8B5CF6", "#EF4444", "#FBBF24"];
    const particles: ConfettiParticle[] = Array.from({ length: 90 }, () => ({
      x: canvas.width / 2 + (Math.random() - 0.5) * 80,
      y: canvas.height * 0.4 + (Math.random() - 0.5) * 60,
      vx: (Math.random() - 0.5) * 14,
      vy: (Math.random() - 0.8) * 15,
      size: Math.random() * 8 + 6,
      color: colors[Math.floor(Math.random() * colors.length)],
      rotation: Math.random() * 360,
      vRotation: (Math.random() - 0.5) * 12,
      alpha: 1,
    }));

    let animationFrameId: number;
    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      let alive = 0;

      particles.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.4; // gravity
        p.rotation += p.vRotation;
        p.alpha -= 0.012;

        if (p.alpha > 0) {
          alive++;
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate((p.rotation * Math.PI) / 180);
          ctx.globalAlpha = Math.max(0, p.alpha);
          ctx.fillStyle = p.color;
          ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
          ctx.restore();
        }
      });

      if (alive > 0) {
        animationFrameId = requestAnimationFrame(render);
      } else {
        setShowConfetti(false);
      }
    };

    animationFrameId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [showConfetti]);

  const handleClaim = async (levelNumber: number) => {
    triggerHaptic([100, 50, 150]);
    setShowConfetti(true);
    await onClaimLevel(levelNumber);
    if (selectedLevel && selectedLevel.level === levelNumber) {
      setSelectedLevel((prev) => (prev ? { ...prev, status: "claimed", isClaimed: true, isClaimable: false } : null));
    }
  };

  // 10 Level horizontal alignment coordinates (zigzag percentage across width)
  // Level 1 at bottom, Level 10 at the golden top!
  const nodeAlignments = [
    { left: "26%" }, // Level 1 (bottom)
    { left: "50%" }, // Level 2
    { left: "74%" }, // Level 3
    { left: "80%" }, // Level 4
    { left: "50%" }, // Level 5
    { left: "20%" }, // Level 6
    { left: "26%" }, // Level 7
    { left: "50%" }, // Level 8
    { left: "74%" }, // Level 9
    { left: "50%" }, // Level 10 (top summit)
  ];

  return (
    <div className="relative w-full overflow-hidden">
      {/* Confetti Celebration Overlay Canvas */}
      {showConfetti && (
        <canvas
          ref={canvasRef}
          className="fixed inset-0 z-50 pointer-events-none"
        />
      )}

      {/* Top Summit Glory Banner */}
      <div className="relative mb-6 p-4 rounded-3xl bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-600 text-white shadow-xl shadow-amber-500/20 overflow-hidden border border-amber-300">
        <div className="absolute -right-6 -bottom-6 size-28 bg-white/10 rounded-full blur-xl pointer-events-none" />
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="size-10 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-xl shadow-inner">
              👑
            </div>
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-amber-100">
                Grand Daily Jackpot
              </span>
              <h3 className="text-sm font-black text-white leading-tight">
                Complete Level 10 for ₹1,100!
              </h3>
            </div>
          </div>
          <span className="px-2.5 py-1 rounded-full bg-white text-amber-800 text-xs font-black shadow-sm font-mono">
            10 Levels
          </span>
        </div>
      </div>

      {/* 10-Level Candy Crush Serpentine Journey Track */}
      <div className="relative pb-10 pt-2">
        {/* Decorative Winding SVG Path in Background */}
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none stroke-zinc-200/80"
          style={{ height: "100%", minHeight: "1050px" }}
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <linearGradient id="candyRoadGradient" x1="0%" y1="100%" x2="0%" y2="0%">
              <stop offset="0%" stopColor="#EC4899" />
              <stop offset="30%" stopColor="#F59E0B" />
              <stop offset="60%" stopColor="#10B981" />
              <stop offset="85%" stopColor="#3B82F6" />
              <stop offset="100%" stopColor="#EAB308" />
            </linearGradient>
            <filter id="glow">
              <feGaussianBlur stdDeviation="3" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Road Path from Level 10 (top) down to Level 1 (bottom) */}
          <path
            d="
              M 195, 75
              C 270, 110 300, 160 290, 205
              C 280, 250 195, 270 195, 305
              C 195, 345 100, 365 100, 415
              C 100, 465 180, 490 195, 525
              C 210, 560 300, 580 300, 635
              C 300, 685 240, 715 195, 745
              C 150, 785 100, 810 100, 855
              C 100, 900 160, 930 195, 965
              C 230, 1000 160, 1030 100, 1070
            "
            fill="none"
            stroke="#E4E4E7"
            strokeWidth="12"
            strokeLinecap="round"
            strokeDasharray="14 10"
          />

          {/* Glowing Active Completed Trail */}
          <path
            d="
              M 195, 75
              C 270, 110 300, 160 290, 205
              C 280, 250 195, 270 195, 305
              C 195, 345 100, 365 100, 415
              C 100, 465 180, 490 195, 525
              C 210, 560 300, 580 300, 635
              C 300, 685 240, 715 195, 745
              C 150, 785 100, 810 100, 855
              C 100, 900 160, 930 195, 965
              C 230, 1000 160, 1030 100, 1070
            "
            fill="none"
            stroke="url(#candyRoadGradient)"
            strokeWidth="8"
            strokeLinecap="round"
            opacity="0.9"
            filter="url(#glow)"
          />
        </svg>

        {/* 10 Level Nodes: Rendered in REVERSE (Level 10 at Top down to Level 1 at Bottom) */}
        <div className="relative space-y-9">
          {[...levels].reverse().map((lvl) => {
            const align = nodeAlignments[lvl.level - 1] || { left: "50%" };
            const isClaiming = claimingLevel === lvl.level;

            return (
              <div
                key={lvl.level}
                className="relative flex items-center justify-center"
                style={{
                  transform: `translateX(${
                    align.left === "20%"
                      ? "-38%"
                      : align.left === "26%"
                      ? "-28%"
                      : align.left === "74%"
                      ? "28%"
                      : align.left === "80%"
                      ? "38%"
                      : "0%"
                  })`,
                }}
              >
                {/* Milestone Node Container */}
                <div className="flex flex-col items-center group">
                  {/* Floating Level Status Tag / Floating Bike Avatar for In-Progress */}
                  {lvl.status === "in_progress" && (
                    <div className="mb-1.5 flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-zinc-900 text-white text-[10px] font-black shadow-lg animate-bounce">
                      <span>🛵</span>
                      <span>YOUR CURRENT TARGET</span>
                    </div>
                  )}

                  {lvl.status === "claimable" && (
                    <div className="mb-1.5 flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-gradient-to-r from-amber-500 to-yellow-400 text-zinc-950 text-[10px] font-black shadow-lg animate-pulse">
                      <Sparkles className="size-3" />
                      <span>UNLOCKED · CLAIM REWARD!</span>
                    </div>
                  )}

                  {/* 3-Star Rating Header for Completed / Claimed Levels */}
                  {lvl.status === "claimed" && (
                    <div className="mb-1 flex items-center gap-0.5 text-amber-400">
                      <Star className="size-3 fill-amber-400" />
                      <Star className="size-3.5 fill-amber-400 -mt-0.5" />
                      <Star className="size-3 fill-amber-400" />
                    </div>
                  )}

                  {/* MAIN CANDY CRUSH 3D BUBBLE BUTTON */}
                  <button
                    type="button"
                    onClick={() => {
                      triggerHaptic(30);
                      setSelectedLevel(lvl);
                    }}
                    className={`relative size-18 rounded-3xl flex flex-col items-center justify-center transition-all duration-300 cursor-pointer shadow-lg active:scale-90 select-none ${
                      lvl.status === "claimed"
                        ? "bg-gradient-to-b from-emerald-400 via-emerald-500 to-teal-700 border-4 border-emerald-300 shadow-emerald-500/30 text-white"
                        : lvl.status === "claimable"
                        ? "bg-gradient-to-b from-amber-400 via-yellow-400 to-orange-500 border-4 border-white shadow-amber-500/50 text-white ring-4 ring-amber-400/80 animate-pulse scale-105"
                        : lvl.status === "in_progress"
                        ? "bg-gradient-to-b from-cyan-500 via-blue-500 to-indigo-700 border-4 border-cyan-300 shadow-blue-500/30 text-white ring-4 ring-cyan-400/40"
                        : "bg-gradient-to-b from-zinc-200 to-zinc-300 border-4 border-zinc-200 shadow-zinc-400/20 text-zinc-400"
                    }`}
                  >
                    {/* 3D Glossy Reflection Highlight */}
                    <div className="absolute top-1 left-2 w-7 h-3 rounded-full bg-white/40 blur-[1px] pointer-events-none" />

                    {/* Badge Emoji or Lock Icon */}
                    <span className="text-2xl drop-shadow-md">
                      {lvl.status === "claimed" ? (
                        <CheckCircle2 className="size-8 text-white drop-shadow" />
                      ) : lvl.status === "locked" ? (
                        <Lock className="size-6 text-zinc-400" />
                      ) : (
                        lvl.badge
                      )}
                    </span>

                    {/* Level Number Pill */}
                    <div
                      className={`absolute -bottom-2.5 px-2 py-0.5 rounded-full text-[10px] font-black tracking-tight border shadow-xs ${
                        lvl.status === "claimed"
                          ? "bg-emerald-900 border-emerald-400 text-emerald-100"
                          : lvl.status === "claimable"
                          ? "bg-amber-900 border-amber-300 text-yellow-200"
                          : lvl.status === "in_progress"
                          ? "bg-blue-900 border-blue-300 text-cyan-200"
                          : "bg-zinc-700 border-zinc-400 text-zinc-300"
                      }`}
                    >
                      LVL {lvl.level}
                    </div>
                  </button>

                  {/* Level Details Beneath Node */}
                  <div className="mt-4 flex flex-col items-center text-center">
                    <span className="text-xs font-black text-zinc-900 leading-tight">
                      {lvl.title}
                    </span>

                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="text-[11px] font-black text-emerald-700 font-mono">
                        +₹{lvl.reward.toFixed(0)}
                      </span>
                      <span className="text-[10px] text-zinc-400 font-bold">•</span>
                      <span className="text-[10px] font-bold text-zinc-600">
                        {lvl.target} {lvl.target === 1 ? "Ride" : "Rides"}
                      </span>
                    </div>

                    {/* Fast Direct Claim Button for Claimable Level */}
                    {lvl.status === "claimable" && (
                      <button
                        type="button"
                        disabled={isClaiming}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleClaim(lvl.level);
                        }}
                        className="mt-1.5 px-3 py-1 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 text-zinc-950 font-black text-xs shadow-md active:scale-95 transition-all flex items-center gap-1 cursor-pointer border border-yellow-200"
                      >
                        <Gift className="size-3.5" />
                        <span>{isClaiming ? "Claiming..." : `CLAIM ₹${lvl.reward}`}</span>
                      </button>
                    )}

                    {/* Claimed Pill */}
                    {lvl.status === "claimed" && (
                      <span className="mt-1 text-[9px] font-black text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md">
                        Claimed ✅
                      </span>
                    )}

                    {/* Progress Indicator for In-Progress */}
                    {lvl.status === "in_progress" && (
                      <span className="mt-1 text-[9px] font-black text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200">
                        {lvl.ridesRemaining} more to go 🎯
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* LEVEL DETAILS MODAL / CLAIM DIALOG                                        */}
      {/* ========================================================================= */}
      {selectedLevel && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="relative w-full max-w-sm rounded-3xl bg-white p-5 shadow-2xl border border-zinc-200 space-y-4 text-zinc-800">
            {/* Close Button */}
            <button
              type="button"
              onClick={() => setSelectedLevel(null)}
              className="absolute top-4 right-4 p-1.5 text-zinc-400 hover:text-zinc-700 bg-zinc-100 hover:bg-zinc-200 rounded-full transition-all cursor-pointer"
            >
              <X className="size-4" />
            </button>

            {/* Level Hero Header */}
            <div className="flex flex-col items-center text-center pt-2">
              <div
                className={`relative size-20 rounded-3xl flex items-center justify-center text-4xl shadow-xl border-4 ${
                  selectedLevel.status === "claimed"
                    ? "bg-gradient-to-b from-emerald-400 to-teal-600 border-emerald-200 text-white"
                    : selectedLevel.status === "claimable"
                    ? "bg-gradient-to-b from-amber-400 to-yellow-500 border-yellow-200 text-white animate-pulse ring-4 ring-amber-300"
                    : selectedLevel.status === "in_progress"
                    ? "bg-gradient-to-b from-blue-400 to-indigo-600 border-blue-200 text-white"
                    : "bg-zinc-200 border-zinc-300 text-zinc-400"
                }`}
              >
                {selectedLevel.badge}
              </div>

              <span className="mt-2.5 text-[10px] font-black uppercase tracking-widest text-zinc-400">
                Level {selectedLevel.level} Milestone · {selectedLevel.flavor}
              </span>
              <h2 className="text-lg font-black text-zinc-900 leading-tight">
                {selectedLevel.title}
              </h2>
              <p className="text-xs text-zinc-500 mt-1 max-w-xs">
                {selectedLevel.description}
              </p>
            </div>

            {/* Reward & Progress Box */}
            <div className="p-3.5 rounded-2xl bg-zinc-50 border border-zinc-200/80 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-zinc-600">Cash Incentive:</span>
                <span className="text-xl font-black font-mono text-emerald-700">
                  +₹{selectedLevel.reward.toFixed(0)}
                </span>
              </div>

              <div className="flex items-center justify-between text-xs text-zinc-600">
                <span>Target Requirement:</span>
                <span className="font-bold text-zinc-900">
                  {selectedLevel.target} Deliveries Today
                </span>
              </div>

              {/* Progress Bar */}
              <div>
                <div className="flex justify-between text-[11px] font-bold text-zinc-500 mb-1">
                  <span>
                    Your Progress: {Math.min(selectedLevel.target, completedToday)} / {selectedLevel.target} rides
                  </span>
                  <span>{selectedLevel.progressPercent}%</span>
                </div>
                <div className="w-full h-2.5 bg-zinc-200 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      selectedLevel.status === "claimed"
                        ? "bg-emerald-500"
                        : selectedLevel.status === "claimable"
                        ? "bg-gradient-to-r from-amber-400 to-yellow-500"
                        : "bg-blue-500"
                    }`}
                    style={{ width: `${selectedLevel.progressPercent}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div>
              {selectedLevel.status === "claimable" ? (
                <button
                  type="button"
                  disabled={claimingLevel === selectedLevel.level}
                  onClick={() => handleClaim(selectedLevel.level)}
                  className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 text-zinc-950 font-black text-sm shadow-xl active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer border border-yellow-200 animate-pulse"
                >
                  <PartyPopper className="size-4.5" />
                  <span>
                    {claimingLevel === selectedLevel.level
                      ? "CLAIMING REWARD..."
                      : `CLAIM ₹${selectedLevel.reward.toFixed(0)} TO WALLET 🎁`}
                  </span>
                </button>
              ) : selectedLevel.status === "claimed" ? (
                <div className="w-full py-3 px-4 rounded-2xl bg-emerald-50 text-emerald-800 font-bold text-xs flex items-center justify-center gap-1.5 border border-emerald-200">
                  <CheckCircle2 className="size-4 text-emerald-600" />
                  <span>Reward Claimed & Added to Captain Wallet!</span>
                </div>
              ) : (
                <div className="w-full py-3 px-4 rounded-2xl bg-zinc-100 text-zinc-600 font-bold text-xs flex items-center justify-center gap-1.5 border border-zinc-200 text-center">
                  <Target className="size-4 text-zinc-400" />
                  <span>
                    Complete {selectedLevel.ridesRemaining} more deliveries today to unlock!
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
