import React, { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import jsQR from "jsqr";
import {
  ArrowRight,
  Camera,
  CameraOff,
  CheckCircle2,
  QrCode,
  RefreshCw,
  Search,
  SwitchCamera,
  Tag,
  X,
} from "lucide-react";
import { toast } from "sonner";
import type { ManagedOrder } from "../../data/partner-orders-mock";
import { inr } from "../../lib/currency";
import { playPartnerOrderAcceptedTone } from "../../lib/partner-order-alert-sound";

interface ScanBagTagModalProps {
  orders: ManagedOrder[];
  onClose: () => void;
  onSelectOrder: (orderId: string) => void;
}

function extractScanCandidates(rawValue: string): string[] {
  const raw = rawValue.trim();
  if (!raw) return [];
  const candidates = new Set<string>([raw.toUpperCase()]);

  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object") {
      ["bagTagToken", "bagTag", "bag_tag", "code", "orderCode", "order_code", "id", "orderId", "order_id"].forEach(
        (key) => {
          const val = (parsed as Record<string, unknown>)[key];
          if (typeof val === "string" && val.trim()) {
            candidates.add(val.trim().toUpperCase());
          }
        }
      );
    }
  } catch {
    // Plain string / URL
  }

  const parts = raw.split(/[/?=&#\s]+/).filter(Boolean);
  for (const part of parts) {
    if (part.length >= 3) {
      candidates.add(part.toUpperCase());
    }
  }
  return Array.from(candidates);
}

/**
 * Live camera + manual search Bag QR / Barcode Scanner.
 * Uses native BarcodeDetector when available with jsQR canvas fallback
 * so camera scanning works across Android WebView, iOS Safari/WKWebView, and Desktop.
 */
export function ScanBagTagModal({ orders, onClose, onSelectOrder }: ScanBagTagModalProps) {
  const [mounted, setMounted] = useState(false);
  const [tokenInput, setTokenInput] = useState("");
  const [matchedOrder, setMatchedOrder] = useState<ManagedOrder | null>(null);
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");
  const [cameraActive, setCameraActive] = useState(true);
  const [cameraState, setCameraState] = useState<"starting" | "streaming" | "error" | "paused">("starting");
  const [cameraError, setCameraError] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const lastScanCheckRef = useRef<number>(0);

  useEffect(() => {
    setMounted(true);
  }, []);

  const stopCameraStream = useCallback(() => {
    if (rafRef.current !== null) {
      window.cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (streamRef.current) {
      for (const track of streamRef.current.getTracks()) {
        try {
          track.stop();
        } catch {}
      }
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  const matchScannedValue = useCallback(
    (rawValue: string): ManagedOrder | null => {
      const candidates = extractScanCandidates(rawValue);
      if (candidates.length === 0) return null;

      return (
        orders.find((o) => {
          const code = (o.code || "").toUpperCase();
          const id = (o.id || "").toUpperCase();
          const bagTag = String((o as any).bagTagToken || (o as any).bagTag || "").toUpperCase();
          const phone = String(o.customerPhone || "");

          return candidates.some(
            (q) =>
              (bagTag && (bagTag === q || bagTag.includes(q))) ||
              (code && (code === q || code.includes(q) || q.includes(code))) ||
              (id && (id === q || (q.length >= 6 && id.includes(q)))) ||
              (phone && q.length >= 6 && phone.includes(q))
          );
        }) || null
      );
    },
    [orders]
  );

  const handleDetectedCode = useCallback(
    (rawCode: string) => {
      const cleaned = rawCode.trim();
      if (!cleaned) return;
      setTokenInput(cleaned);
      const found = matchScannedValue(cleaned);
      setMatchedOrder(found);
      if (found) {
        playPartnerOrderAcceptedTone();
        if (typeof navigator !== "undefined" && navigator.vibrate) {
          navigator.vibrate(120);
        }
        toast.success(`Bag matched: Order #${found.code}`);
        setCameraActive(false);
        setCameraState("paused");
        stopCameraStream();
      }
    },
    [matchScannedValue, stopCameraStream]
  );

  const handleManualSearch = (query: string) => {
    setTokenInput(query);
    if (!query.trim()) {
      setMatchedOrder(null);
      return;
    }
    setMatchedOrder(matchScannedValue(query));
  };

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        stopCameraStream();
        onClose();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose, stopCameraStream]);

  useEffect(() => {
    if (!mounted || !cameraActive) {
      stopCameraStream();
      if (!cameraActive) setCameraState("paused");
      return;
    }

    let cancelled = false;

    const startCamera = async () => {
      if (
        typeof navigator === "undefined" ||
        !navigator.mediaDevices ||
        !navigator.mediaDevices.getUserMedia
      ) {
        setCameraState("error");
        setCameraError("Camera access is not supported on this device/browser.");
        return;
      }

      setCameraState("starting");
      setCameraError(null);
      stopCameraStream();

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: facingMode },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        });

        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        streamRef.current = stream;
        const video = videoRef.current;
        if (!video) return;

        video.srcObject = stream;
        await video.play().catch(() => {});
        if (cancelled) return;
        setCameraState("streaming");

        const BarcodeDetectorCtor =
          typeof window !== "undefined" ? (window as any).BarcodeDetector : undefined;
        let nativeDetector: any = null;
        if (BarcodeDetectorCtor) {
          try {
            nativeDetector = new BarcodeDetectorCtor({
              formats: ["qr_code", "code_128", "code_39", "ean_13", "ean_8", "upc_a"],
            });
          } catch {
            nativeDetector = null;
          }
        }

        const scanFrame = async (ts: number) => {
          if (cancelled || !videoRef.current) return;
          const v = videoRef.current;

          if (v.readyState >= 2 && v.videoWidth > 0 && ts - lastScanCheckRef.current > 150) {
            lastScanCheckRef.current = ts;

            // 1. Native BarcodeDetector (supports QR + 1D Barcodes cleanly)
            if (nativeDetector) {
              try {
                const detections = await nativeDetector.detect(v);
                if (!cancelled && Array.isArray(detections) && detections.length > 0) {
                  const first = detections[0]?.rawValue;
                  if (first) {
                    handleDetectedCode(String(first));
                    return;
                  }
                }
              } catch {
                // Fall back to jsQR below
              }
            }

            // 2. Universal jsQR fallback for all WebViews / iOS Safari / Firefox
            try {
              const canvas = canvasRef.current || document.createElement("canvas");
              canvasRef.current = canvas;
              const width = v.videoWidth;
              const height = v.videoHeight;
              if (canvas.width !== width) canvas.width = width;
              if (canvas.height !== height) canvas.height = height;

              const ctx = canvas.getContext("2d", { willReadFrequently: true });
              if (ctx) {
                ctx.drawImage(v, 0, 0, width, height);
                const imgData = ctx.getImageData(0, 0, width, height);
                const decoded = jsQR(imgData.data, width, height, {
                  inversionAttempts: "dontInvert",
                });
                if (!cancelled && decoded?.data) {
                  handleDetectedCode(decoded.data);
                  return;
                }
              }
            } catch {
              // Ignore single frame decode failures
            }
          }

          if (!cancelled) {
            rafRef.current = window.requestAnimationFrame(scanFrame);
          }
        };

        rafRef.current = window.requestAnimationFrame(scanFrame);
      } catch (err: any) {
        if (cancelled) return;
        setCameraState("error");
        const msg = String(err?.name || err?.message || "");
        if (msg.includes("NotAllowed") || msg.includes("Permission")) {
          setCameraError("Camera permission denied. Allow camera access or enter the Bag/Order code below.");
        } else if (msg.includes("NotFound") || msg.includes("DevicesNotFound")) {
          setCameraError("No camera detected on this device.");
        } else {
          setCameraError("Unable to open camera. You can still type or scan with a handheld scanner.");
        }
      }
    };

    void startCamera();

    return () => {
      cancelled = true;
      stopCameraStream();
    };
  }, [mounted, cameraActive, facingMode, handleDetectedCode, stopCameraStream]);

  if (!mounted || typeof document === "undefined") return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="scan-bag-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          stopCameraStream();
          onClose();
        }
      }}
      className="fixed inset-0 z-[130] flex items-end sm:items-center justify-center bg-zinc-950/65 backdrop-blur-xs p-0 sm:p-4 animate-in fade-in duration-150"
    >
      <div className="relative w-full sm:max-w-md overflow-hidden rounded-t-3xl sm:rounded-2xl border border-zinc-200 bg-white p-5 shadow-2xl animate-in slide-in-from-bottom-4 sm:zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 pb-3.5 border-b border-zinc-100">
          <div className="flex items-center gap-2.5">
            <span className="flex size-9 items-center justify-center rounded-xl border border-zinc-200 bg-zinc-50 text-zinc-900">
              <QrCode className="size-4.5" />
            </span>
            <div>
              <h2 id="scan-bag-modal-title" className="text-sm font-bold text-zinc-950">
                Scan Laundry Bag QR
              </h2>
              <p className="text-[11px] font-medium text-zinc-500">
                Point camera at Bag Tag QR or barcode
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              stopCameraStream();
              onClose();
            }}
            aria-label="Close scanner"
            className="flex size-8 items-center justify-center rounded-lg border border-zinc-200 bg-white text-zinc-500 hover:bg-zinc-50 hover:text-zinc-900 cursor-pointer"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Camera Viewfinder */}
        <div className="mt-4 space-y-3.5">
          <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl border border-zinc-200 bg-zinc-950">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className={`h-full w-full object-cover ${cameraState === "streaming" ? "opacity-100" : "opacity-0"}`}
            />

            {/* Corner Framing Guides while streaming */}
            {cameraState === "streaming" ? (
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <div className="relative size-48 rounded-2xl border border-white/30 shadow-[0_0_0_999px_rgba(9,9,11,0.38)]">
                  <span className="absolute -left-0.5 -top-0.5 size-6 rounded-tl-xl border-l-3 border-t-3 border-emerald-400" />
                  <span className="absolute -right-0.5 -top-0.5 size-6 rounded-tr-xl border-r-3 border-t-3 border-emerald-400" />
                  <span className="absolute -left-0.5 -bottom-0.5 size-6 rounded-bl-xl border-l-3 border-b-3 border-emerald-400" />
                  <span className="absolute -right-0.5 -bottom-0.5 size-6 rounded-br-xl border-r-3 border-b-3 border-emerald-400" />
                </div>
              </div>
            ) : null}

            {/* Starting / Error / Paused States */}
            {cameraState === "starting" ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-white">
                <RefreshCw className="size-6 animate-spin text-zinc-300" />
                <p className="text-xs font-semibold">Opening camera...</p>
              </div>
            ) : null}

            {cameraState === "error" ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-5 text-center text-white">
                <CameraOff className="size-8 text-zinc-400" />
                <p className="text-xs font-medium text-zinc-300 max-w-xs">{cameraError}</p>
                <button
                  type="button"
                  onClick={() => {
                    setCameraActive(true);
                    setCameraState("starting");
                  }}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-white px-3.5 py-2 text-xs font-semibold text-zinc-950 hover:bg-zinc-100 cursor-pointer"
                >
                  <Camera className="size-3.5" />
                  Open Camera
                </button>
              </div>
            ) : null}

            {cameraState === "paused" && !matchedOrder ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-zinc-950 text-white">
                <Camera className="size-7 text-zinc-400" />
                <button
                  type="button"
                  onClick={() => setCameraActive(true)}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 px-4 py-2 text-xs font-semibold text-white cursor-pointer"
                >
                  <Camera className="size-3.5" />
                  Start Camera Scan
                </button>
              </div>
            ) : null}

            {/* Top Floating Camera Controls */}
            {cameraState === "streaming" ? (
              <div className="absolute bottom-3 inset-x-3 flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() =>
                    setFacingMode((prev) => (prev === "environment" ? "user" : "environment"))
                  }
                  className="inline-flex items-center gap-1.5 rounded-lg bg-zinc-950/75 backdrop-blur-xs border border-white/15 px-2.5 py-1.5 text-[11px] font-semibold text-white hover:bg-zinc-900 cursor-pointer"
                >
                  <SwitchCamera className="size-3.5" />
                  Flip
                </button>

                <button
                  type="button"
                  onClick={() => setCameraActive(false)}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-zinc-950/75 backdrop-blur-xs border border-white/15 px-2.5 py-1.5 text-[11px] font-semibold text-white hover:bg-zinc-900 cursor-pointer"
                >
                  <CameraOff className="size-3.5" />
                  Stop Camera
                </button>
              </div>
            ) : null}
          </div>

          {/* Clean Fallback Code Input (No verbose placeholder clutter) */}
          <div className="relative">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-zinc-400" />
            <input
              type="text"
              value={tokenInput}
              onChange={(e) => handleManualSearch(e.target.value)}
              placeholder=""
              aria-label="Enter bag tag or order code"
              className="h-10 w-full rounded-xl border border-zinc-200 bg-zinc-50/70 focus:bg-white pl-10 pr-9 text-xs font-semibold text-zinc-950 focus:border-zinc-900 focus:outline-hidden"
            />
            {tokenInput ? (
              <button
                type="button"
                onClick={() => {
                  setTokenInput("");
                  setMatchedOrder(null);
                  setCameraActive(true);
                }}
                aria-label="Clear and rescan"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-full p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-800 cursor-pointer"
              >
                <X className="size-3.5" />
              </button>
            ) : null}
          </div>

          {/* Matched Order Preview Card */}
          {matchedOrder ? (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-3.5 space-y-2.5 animate-in fade-in duration-150">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="size-4 text-emerald-600" />
                    <span className="text-xs font-bold text-emerald-950 tabular-nums">
                      Order #{matchedOrder.code}
                    </span>
                  </div>
                  <p className="mt-1 text-xs font-semibold text-zinc-900">
                    {matchedOrder.customerName || "QuickPress Customer"}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-zinc-950 tabular-nums">
                    {inr(matchedOrder.amount)}
                  </p>
                  <span className="text-[10px] font-bold uppercase text-zinc-600">
                    {matchedOrder.stage}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between gap-2 pt-2 border-t border-emerald-200/70">
                <button
                  type="button"
                  onClick={() => {
                    setMatchedOrder(null);
                    setTokenInput("");
                    setCameraActive(true);
                  }}
                  className="inline-flex items-center gap-1 rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-zinc-700 hover:bg-zinc-50 cursor-pointer"
                >
                  <Tag className="size-3" />
                  Rescan
                </button>
                <button
                  type="button"
                  onClick={() => {
                    stopCameraStream();
                    onSelectOrder(matchedOrder.id);
                  }}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 px-3.5 py-2 text-xs font-bold text-white cursor-pointer"
                >
                  Open Order
                  <ArrowRight className="size-3.5" />
                </button>
              </div>
            </div>
          ) : tokenInput.trim() ? (
            <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-center text-xs font-medium text-zinc-600">
              No active order matched &ldquo;{tokenInput}&rdquo;.
            </div>
          ) : null}
        </div>
      </div>
    </div>,
    document.body
  );
}
