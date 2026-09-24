import React, { useRef, useState, useEffect, useCallback } from "react";
import { Camera, X, RefreshCw, AlertCircle } from "lucide-react";

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
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex flex-col items-center justify-between p-4 sm:p-6 animate-in fade-in duration-200">
      {/* Top Header */}
      <div className="w-full max-w-md flex items-center justify-between text-white py-2">
        <div className="flex items-center gap-2">
          <Camera className="w-5 h-5 text-[#00C853]" />
          <span className="text-sm font-bold tracking-wide">Live Photo / Selfie</span>
        </div>
        <button
          type="button"
          onClick={() => {
            stopStream();
            onClose();
          }}
          className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-all text-white"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Main Camera Viewfinder */}
      <div className="w-full max-w-md flex-1 flex flex-col items-center justify-center my-auto">
        <div className="relative w-full aspect-3/4 max-h-[65vh] rounded-3xl overflow-hidden bg-neutral-900 border-2 border-white/20 shadow-2xl flex items-center justify-center">
          {cameraError ? (
            <div className="p-6 text-center space-y-3">
              <AlertCircle className="w-10 h-10 text-amber-400 mx-auto" />
              <p className="text-sm font-bold text-white">Camera Access Required</p>
              <p className="text-xs text-neutral-400 max-w-xs">{cameraError}</p>
              <button
                type="button"
                onClick={startCamera}
                className="mt-3 px-4 py-2 bg-[#00C853] text-white text-xs font-bold rounded-xl"
              >
                Retry Camera
              </button>
            </div>
          ) : (
            <>
              <video
                ref={videoRef}
                playsInline
                autoPlay
                muted
                className={`w-full h-full object-cover ${facingMode === "user" ? "-scale-x-100" : ""}`}
              />

              {/* Simple Oval framing guide */}
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                <div className="w-52 h-64 rounded-full border-2 border-dashed border-white/40 shadow-[0_0_0_9999px_rgba(0,0,0,0.25)]" />
              </div>

              {isStarting && (
                <div className="absolute inset-0 bg-neutral-900/80 flex items-center justify-center text-white text-xs font-bold">
                  Starting Camera...
                </div>
              )}
            </>
          )}
        </div>
        <p className="text-[11px] text-white/60 mt-3 text-center">
          Apna chehra frame me rakhein aur neeche diye gaye button par click karein
        </p>
      </div>

      {/* Shutter / Controls Footer */}
      <div className="w-full max-w-md flex items-center justify-around py-4">
        {/* Flip button */}
        <button
          type="button"
          onClick={toggleCamera}
          className="w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all"
          title="Flip Camera"
        >
          <RefreshCw className="w-5 h-5" />
        </button>

        {/* Shutter Button */}
        <button
          type="button"
          disabled={Boolean(cameraError) || isStarting}
          onClick={handleCapture}
          className="w-18 h-18 rounded-full border-4 border-white flex items-center justify-center active:scale-90 transition-all disabled:opacity-50"
        >
          <div className="w-14 h-14 rounded-full bg-white hover:bg-neutral-200 transition-colors" />
        </button>

        {/* Placeholder spacer for balance */}
        <div className="w-12 h-12" />
      </div>
    </div>
  );
}
