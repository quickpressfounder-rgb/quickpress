import { Gift, Sparkles } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Animated scratch card — canvas foil the user rubs away to reveal a reward.
 * Uses only QuickPress design tokens (brand gradient, radius, shadows).
 */
export function ScratchCard({
  reward,
  caption,
  isScratched = false,
  onRevealed,
}: {
  reward: string;
  caption: string;
  isScratched?: boolean | undefined;
  onRevealed?: (reward: string) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawing = useRef(false);
  const [revealed, setRevealed] = useState(isScratched);

  useEffect(() => {
    if (isScratched) {
      setRevealed(true);
    }
  }, [isScratched]);

  const paintFoil = useCallback(() => {
    if (isScratched || revealed) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.max(1, Math.floor(rect.width * dpr));
    canvas.height = Math.max(1, Math.floor(rect.height * dpr));
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.scale(dpr, dpr);
    const gradient = ctx.createLinearGradient(0, 0, rect.width, rect.height);
    gradient.addColorStop(0, "#2f3542");
    gradient.addColorStop(1, "#7a8899");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, rect.width, rect.height);
    ctx.font = "600 12px Inter, sans-serif";
    ctx.fillStyle = "rgba(255,255,255,0.75)";
    ctx.textAlign = "center";
    ctx.fillText("Scratch to reveal", rect.width / 2, rect.height / 2 + 4);
  }, [isScratched, revealed]);

  useEffect(() => {
    paintFoil();
    window.addEventListener("resize", paintFoil);
    return () => window.removeEventListener("resize", paintFoil);
  }, [paintFoil]);

  const scratchAt = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas || revealed) return;
    const rect = canvas.getBoundingClientRect();
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.globalCompositeOperation = "destination-out";
    ctx.beginPath();
    ctx.arc(clientX - rect.left, clientY - rect.top, 22, 0, Math.PI * 2);
    ctx.fill();

    const dpr = window.devicePixelRatio || 1;
    const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    let clear = 0;
    const step = 16 * Math.ceil(dpr);
    for (let i = 3; i < data.length; i += step) {
      if (data[i] === 0) clear += 1;
    }
    if (clear / (data.length / step) > 0.45) {
      setRevealed(true);
      onRevealed?.(reward);
    }
  };

  return (
    <div className="card-soft relative aspect-[4/3] overflow-hidden border border-border">
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-gradient-to-br from-amber-100/40 via-background to-emerald-100/30 px-3 text-center">
        <span className="flex size-10 items-center justify-center rounded-2xl bg-amber-500/20 text-amber-600">
          <Gift className="size-5" />
        </span>
        <p className="text-sm font-black tracking-tight text-foreground">{reward}</p>
        <p className="text-[0.65rem] text-muted-foreground">{caption}</p>
        {revealed ? (
          <span className="absolute top-2 right-2 flex items-center gap-1 text-[9px] font-black text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full border border-emerald-200">
            <Sparkles className="size-3 text-emerald-600" />
            Claimed
          </span>
        ) : null}
      </div>

      {!revealed && (
        <canvas
          ref={canvasRef}
          aria-label={`Scratch card: ${reward}`}
          className="absolute inset-0 size-full cursor-pointer touch-none transition-opacity duration-500 opacity-100"
          onPointerDown={(event) => {
            drawing.current = true;
            scratchAt(event.clientX, event.clientY);
          }}
          onPointerMove={(event) => {
            if (drawing.current) scratchAt(event.clientX, event.clientY);
          }}
          onPointerUp={() => {
            drawing.current = false;
          }}
          onPointerLeave={() => {
            drawing.current = false;
          }}
        />
      )}
    </div>
  );
}
