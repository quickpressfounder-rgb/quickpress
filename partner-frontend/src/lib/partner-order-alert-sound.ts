/**
 * QuickPress Partner (Merchant) High-Priority Order Siren & Sound Engine.
 *
 * Distinct Commercial Laundromat Shop Chime:
 * - Multi-stage POS cash register multi-chime (Bb5 -> D6 -> F6 -> Bb6)
 * - Resonant store counter service bell ding (C7 + E7)
 * - Dual Engine: Web Audio API Oscillator synthesizer + Dynamic 16-bit PCM WAV Blob fallback
 * - Plays continuously at high volume with mobile vibration until accepted or dismissed.
 */

let audioCtx: AudioContext | null = null;
let sirenInterval: ReturnType<typeof setInterval> | null = null;
let activeHtml5Audio: HTMLAudioElement | null = null;
let isAudioActive = false;
let cachedPartnerWavUrl: string | null = null;

function getAudioContext(): AudioContext | null {
  try {
    if (typeof window === "undefined") return null;
    if (!audioCtx) {
      const AudioContextClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      if (!AudioContextClass) return null;
      audioCtx = new AudioContextClass();
    }
    if (audioCtx.state === "suspended") {
      audioCtx.resume().catch(() => {});
    }
    return audioCtx;
  } catch {
    return null;
  }
}

/**
 * Synthesizes a 16-bit PCM WAV audio buffer in memory.
 * Produces an ultra-clean, resonant commercial merchant order alert.
 */
function getPartnerChimeWavUrl(): string {
  if (cachedPartnerWavUrl) return cachedPartnerWavUrl;
  try {
    const sampleRate = 22050;
    const duration = 1.5;
    const numSamples = Math.floor(sampleRate * duration);
    const buffer = new ArrayBuffer(44 + numSamples * 2);
    const view = new DataView(buffer);

    const writeStr = (offset: number, str: string) => {
      for (let i = 0; i < str.length; i++) {
        view.setUint8(offset + i, str.charCodeAt(i));
      }
    };

    writeStr(0, "RIFF");
    view.setUint32(4, 36 + numSamples * 2, true);
    writeStr(8, "WAVE");
    writeStr(12, "fmt ");
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true); // PCM format
    view.setUint16(22, 1, true); // Mono
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true); // 16-bit
    writeStr(36, "data");
    view.setUint32(40, numSamples * 2, true);

    let offset = 44;
    for (let i = 0; i < numSamples; i++) {
      const t = i / sampleRate;
      let sample = 0;

      // Note 1: Bb5 (932.3 Hz) (0.0s - 0.25s)
      if (t >= 0 && t < 0.25) {
        const dt = t;
        const decay = Math.exp(-dt * 8.0);
        sample +=
          (Math.sin(2 * Math.PI * 932.33 * dt) * 0.45 +
            Math.sin(2 * Math.PI * 1864.66 * dt) * 0.2) *
          decay;
      }

      // Note 2: D6 (1174.7 Hz) (0.12s - 0.38s)
      if (t >= 0.12 && t < 0.38) {
        const dt = t - 0.12;
        const decay = Math.exp(-dt * 8.0);
        sample +=
          (Math.sin(2 * Math.PI * 1174.66 * dt) * 0.45 +
            Math.sin(2 * Math.PI * 2349.32 * dt) * 0.2) *
          decay;
      }

      // Note 3: F6 (1396.9 Hz) (0.24s - 0.55s)
      if (t >= 0.24 && t < 0.55) {
        const dt = t - 0.24;
        const decay = Math.exp(-dt * 7.5);
        sample +=
          (Math.sin(2 * Math.PI * 1396.91 * dt) * 0.5 +
            Math.sin(2 * Math.PI * 2793.82 * dt) * 0.2) *
          decay;
      }

      // Note 4: Bb6 (1864.7 Hz) Cash Register Climax (0.38s - 0.8s)
      if (t >= 0.38 && t < 0.8) {
        const dt = t - 0.38;
        const decay = Math.exp(-dt * 6.5);
        sample +=
          (Math.sin(2 * Math.PI * 1864.66 * dt) * 0.55 +
            Math.sin(2 * Math.PI * 3729.32 * dt) * 0.25) *
          decay;
      }

      // Counter Service Bell Ping 1: C7 (2093 Hz) (0.7s - 1.1s)
      if (t >= 0.7 && t < 1.1) {
        const dt = t - 0.7;
        const decay = Math.exp(-dt * 7.0);
        sample +=
          (Math.sin(2 * Math.PI * 2093.0 * dt) * 0.5 +
            Math.sin(2 * Math.PI * 4186.0 * dt) * 0.2) *
          decay;
      }

      // Counter Service Bell Ping 2: E7 (2637 Hz) (0.9s - 1.45s)
      if (t >= 0.9 && t < 1.45) {
        const dt = t - 0.9;
        const decay = Math.exp(-dt * 6.0);
        sample +=
          (Math.sin(2 * Math.PI * 2637.02 * dt) * 0.55 +
            Math.sin(2 * Math.PI * 5274.04 * dt) * 0.25) *
          decay;
      }

      const intSample = Math.max(-1, Math.min(1, sample)) * 32767;
      view.setInt16(offset, intSample, true);
      offset += 2;
    }

    const blob = new Blob([buffer], { type: "audio/wav" });
    cachedPartnerWavUrl = URL.createObjectURL(blob);
    return cachedPartnerWavUrl;
  } catch {
    return "";
  }
}

/**
 * Triggers intense commercial merchant haptic vibration.
 */
export function triggerPartnerHaptic(): void {
  if (typeof navigator !== "undefined" && "vibrate" in navigator) {
    try {
      navigator.vibrate([350, 100, 350, 100, 600, 150, 600]);
    } catch {}
  }
}

/**
 * Plays a single burst of the Laundromat Partner Commercial Chime.
 */
export function playPartnerOrderChime(): void {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    // Harmonic Cash Register Chimes + Service Counter Bell
    const notes = [
      { freq: 932.33, start: 0.0, duration: 0.22, vol: 0.5 }, // Bb5
      { freq: 1174.66, start: 0.12, duration: 0.24, vol: 0.5 }, // D6
      { freq: 1396.91, start: 0.24, duration: 0.28, vol: 0.55 }, // F6
      { freq: 1864.66, start: 0.38, duration: 0.38, vol: 0.6 }, // Bb6
      { freq: 2093.0, start: 0.7, duration: 0.35, vol: 0.65 }, // C7 Bell Strike 1
      { freq: 2637.02, start: 0.9, duration: 0.5, vol: 0.7 }, // E7 Bell Strike 2
    ];

    notes.forEach(({ freq, start, duration, vol }) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, now + start);

      gain.gain.setValueAtTime(0.001, now + start);
      gain.gain.linearRampToValueAtTime(vol, now + start + 0.008);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + start + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + start);
      osc.stop(now + start + duration + 0.05);
    });

    // Also add crisp overtone shimmer
    const shimmer = ctx.createOscillator();
    const shimmerGain = ctx.createGain();
    shimmer.type = "triangle";
    shimmer.frequency.setValueAtTime(3729.32, now + 0.38);
    shimmerGain.gain.setValueAtTime(0.001, now + 0.38);
    shimmerGain.gain.linearRampToValueAtTime(0.2, now + 0.39);
    shimmerGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.75);
    shimmer.connect(shimmerGain);
    shimmerGain.connect(ctx.destination);
    shimmer.start(now + 0.38);
    shimmer.stop(now + 0.8);

    triggerPartnerHaptic();
  } catch {}
}

/**
 * Starts continuous repeating merchant alert ring for incoming new orders.
 * Rings every 1.5 seconds with dual engine (Web Audio + HTML5 WAV fallback).
 */
export function startPartnerOrderAlertRing(): void {
  if (isAudioActive) return;
  isAudioActive = true;

  // Immediate first ring
  playPartnerOrderChime();
  triggerPartnerHaptic();

  // Engine 1: Looping interval
  sirenInterval = setInterval(() => {
    if (!isAudioActive) {
      if (sirenInterval) clearInterval(sirenInterval);
      return;
    }
    playPartnerOrderChime();
    triggerPartnerHaptic();
  }, 1550);

  // Engine 2: HTML5 Audio with embedded WAV fallback for suspended contexts / locked screens
  try {
    const wavUrl = getPartnerChimeWavUrl();
    if (wavUrl) {
      if (!activeHtml5Audio) {
        activeHtml5Audio = new Audio(wavUrl);
      } else {
        activeHtml5Audio.src = wavUrl;
      }
      activeHtml5Audio.loop = true;
      activeHtml5Audio.volume = 1.0;
      void activeHtml5Audio.play().catch(() => {});
    }
  } catch {}

  // Auto safety shutoff after 45 seconds if unacknowledged
  setTimeout(() => {
    stopPartnerOrderAlertRing();
  }, 45000);
}

/**
 * Stops continuous repeating merchant alert ring.
 */
export function stopPartnerOrderAlertRing(): void {
  isAudioActive = false;
  if (sirenInterval) {
    clearInterval(sirenInterval);
    sirenInterval = null;
  }
  if (activeHtml5Audio) {
    try {
      activeHtml5Audio.pause();
      activeHtml5Audio.currentTime = 0;
    } catch {}
    activeHtml5Audio = null;
  }
  if (typeof navigator !== "undefined" && "vibrate" in navigator) {
    try {
      navigator.vibrate(0);
    } catch {}
  }
}

/**
 * Positive tone when order is successfully accepted by partner store.
 */
export function playPartnerOrderAcceptedTone(): void {
  stopPartnerOrderAlertRing();
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    const chords = [
      { freq: 587.33, start: 0.0, duration: 0.15 }, // D5
      { freq: 739.99, start: 0.12, duration: 0.15 }, // F#5
      { freq: 880.0, start: 0.24, duration: 0.2 }, // A5
      { freq: 1174.66, start: 0.38, duration: 0.4 }, // D6 climax
    ];

    chords.forEach(({ freq, start, duration }) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, now + start);
      gain.gain.setValueAtTime(0.001, now + start);
      gain.gain.exponentialRampToValueAtTime(0.3, now + start + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + start + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + start);
      osc.stop(now + start + duration);
    });

    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      try {
        navigator.vibrate([80, 40, 120]);
      } catch {}
    }
  } catch {}
}

/**
 * Test function for previewing the Laundromat Store Order Ringtone.
 */
export function testPartnerSoundAndVibration(): void {
  playPartnerOrderChime();
}
