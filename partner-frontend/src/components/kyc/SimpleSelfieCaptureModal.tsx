import React, { useRef, useState, useEffect, useCallback } from "react";
import { Camera, X, RefreshCw, AlertCircle, Sparkles } from "lucide-react";

interface SimpleSelfieCaptureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCapture: (dataUrl: string) => void;
}

export function SimpleSelfieCaptureModal({
  isOpen,
  onClose,
  onCapture,
}: SimpleSelfieCaptureModalProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [facingMode, setFacingMode] = useState<"user" | "environment">("user");
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isStarting, setIsStarting] = useState<boolean>(true);

  const stopStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  }, []);

  const startCamera = useCallback(async () => {
    stopStream();
    setIsStarting(true);
    setCameraError(null);

    try {
      if (!navigator?.mediaDevices?.getUserMedia) {
        throw new Error("Camera not supported on this browser");
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: facingMode },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setIsStarting(false);
    } catch (err: any) {
      setIsStarting(false);
      setCameraError(err?.message || "Could not access camera. Please allow camera permissions.");
    }
  }, [facingMode, stopStream]);

  useEffect(() => {
    if (isOpen) {
      startCamera();
    } else {
      stopStream();
    }
    return () => {
      stopStream();
    };
  }, [isOpen, startCamera, stopStream]);

  const handleCapture = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const width = video.videoWidth || 640;
    const height = video.videoHeight || 480;

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Flip horizontal for mirror selfie
    if (facingMode === "user") {
      ctx.translate(width, 0);
      ctx.scale(-1, 1);
    }

    ctx.drawImage(video, 0, 0, width, height);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.88);

    stopStream();
    onCapture(dataUrl);
    onClose();
  };

  const toggleCamera = () => {
    setFacingMode((prev) => (prev === "user" ? "environment" : "user"));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl overflow-hidden max-w-sm w-full shadow-2xl flex flex-col border border-neutral-200 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-5 py-4 border-b border-neutral-100 flex items-center justify-between bg-neutral-50/50">
          <div className="flex items-center gap-2">
            <div className="size-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <Camera className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-black text-sm text-neutral-900">Owner Live Photo</h3>
              <p className="text-[11px] text-neutral-500 font-medium">Position your face inside the circle</p>
            </div>
          </div>
          <button
            onClick={() => {
              stopStream();
              onClose();
            }}
            className="p-1.5 rounded-full hover:bg-neutral-200/80 text-neutral-400 hover:text-neutral-700 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Viewfinder Area */}
        <div className="relative aspect-4/5 bg-neutral-950 flex items-center justify-center overflow-hidden">
          {isStarting && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-white/80 z-10 bg-neutral-900">
              <RefreshCw className="w-6 h-6 animate-spin text-emerald-400" />
              <p className="text-xs font-semibold">Starting secure camera...</p>
            </div>
          )}

          {cameraError ? (
            <div className="p-6 text-center text-white space-y-3">
              <AlertCircle className="w-8 h-8 text-rose-400 mx-auto" />
              <p className="text-xs text-rose-200">{cameraError}</p>
              <button
                onClick={startCamera}
                className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-xl text-xs font-bold transition"
              >
                Retry Camera
              </button>
            </div>
          ) : (
            <>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className={`w-full h-full object-cover ${
                  facingMode === "user" ? "-scale-x-100" : ""
                }`}
              />

              {/* Face Guide Oval */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-52 h-64 border-2 border-dashed border-emerald-400/80 rounded-[50%] shadow-[0_0_0_9999px_rgba(0,0,0,0.45)]" />
              </div>

              {/* Instructions banner */}
              <div className="absolute top-4 left-4 right-4 text-center pointer-events-none">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-black/60 backdrop-blur-md rounded-full text-[11px] font-semibold text-white/90">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                  Look straight with clear lighting
                </span>
              </div>
            </>
          )}
        </div>

        {/* Actions Bottom Bar */}
        <div className="p-5 flex items-center justify-between gap-4 bg-white border-t border-neutral-100">
          <button
            type="button"
            onClick={toggleCamera}
            disabled={Boolean(cameraError) || isStarting}
            className="p-3 rounded-2xl bg-neutral-100 hover:bg-neutral-200 text-neutral-700 transition disabled:opacity-50"
            title="Flip Camera"
          >
            <RefreshCw className="w-5 h-5" />
          </button>

          <button
            type="button"
            onClick={handleCapture}
            disabled={Boolean(cameraError) || isStarting}
            className="flex-1 py-3 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-md shadow-emerald-600/20 active:scale-95 transition flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <Camera className="w-4 h-4" />
            Capture Photo
          </button>
        </div>
      </div>
    </div>
  );
}
