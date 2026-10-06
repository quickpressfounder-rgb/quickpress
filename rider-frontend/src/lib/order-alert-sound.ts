/**
 * Rapido / Zomato style High-Frequency Dispatch Alert Audio & Haptics Engine
 * Uses Web Audio API synthesizers and Hardware Vibration to produce
 * guaranteed loud dispatch rings across all Android and browser platforms.
 */

let audioCtx: AudioContext | null = null;
let alertIntervalId: ReturnType<typeof setInterval> | null = null;
let vibrationIntervalId: ReturnType<typeof setInterval> | null = null;
let isRinging = false;

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const AudioContextClass =
    window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  if (!AudioContextClass) return null;
  if (!audioCtx || audioCtx.state === "closed") {
    audioCtx = new AudioContextClass();
  }
  if (audioCtx.state === "suspended") {
    void audioCtx.resume();
  }
  return audioCtx;
}

/** Plays a single high-pitch dual-tone Rapido dispatch chime chord */
function playSirenBeepTone() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;

    // Tone 1 - Base carrier (880 Hz / A5)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = "sine";
    osc1.frequency.setValueAtTime(880, now);
    osc1.frequency.exponentialRampToValueAtTime(1320, now + 0.18);

    gain1.gain.setValueAtTime(0.01, now);
    gain1.gain.linearRampToValueAtTime(0.65, now + 0.05);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.38);

    // Tone 2 - Urgency Harmonic (1760 Hz / A6)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = "triangle";
    osc2.frequency.setValueAtTime(1175, now + 0.08);
    osc2.frequency.exponentialRampToValueAtTime(1760, now + 0.28);

    gain2.gain.setValueAtTime(0.01, now + 0.08);
    gain2.gain.linearRampToValueAtTime(0.5, now + 0.14);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.42);

    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.08);
    osc2.stop(now + 0.45);
  } catch (err) {
    console.warn("Could not play synthesized order tone:", err);
  }
}

/** Trigger hardware vibration pattern */
function triggerVibration() {
  if (typeof navigator !== "undefined" && "vibrate" in navigator) {
    try {
      navigator.vibrate([350, 100, 350, 100, 500]);
    } catch {
      /* ignore */
    }
  }
}

import {
  playOrderAlertSound,
  stopOrderAlertSound as stopCaptainAudioSound,
} from "./captain-audio";

/** Starts continuous radar siren chime and haptic pulsing */
export function startOrderAlertRing(isMuted = false) {
  if (isRinging) return;
  isRinging = true;

  if (!isMuted) {
    playOrderAlertSound();
  }
}

/** Stops the continuous siren and haptics */
export function stopOrderAlertRing() {
  isRinging = false;
  stopCaptainAudioSound();
}

export function isAlertRinging(): boolean {
  return isRinging;
}

/** Play positive accept fanfare */
export function playAcceptSuccessChime() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, now + i * 0.08);

      gain.gain.setValueAtTime(0.01, now + i * 0.08);
      gain.gain.linearRampToValueAtTime(0.4, now + i * 0.08 + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.08 + 0.3);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + i * 0.08);
      osc.stop(now + i * 0.08 + 0.32);
    });

    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      navigator.vibrate([100, 50, 200]);
    }
  } catch {
    /* ignore */
  }
}

/** Play reject declining low tone */
export function playDeclineChime() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    const notes = [440, 330];
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(freq, now + i * 0.12);

      gain.gain.setValueAtTime(0.01, now + i * 0.12);
      gain.gain.linearRampToValueAtTime(0.25, now + i * 0.12 + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.12 + 0.25);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + i * 0.12);
      osc.stop(now + i * 0.12 + 0.28);
    });
  } catch {
    /* ignore */
  }
}

/** Quick test function for onboarding permission verification */
export function testSoundAndVibration() {
  playSirenBeepTone();
  triggerVibration();
}

/** Play Online ascending chime */
export function playOnlineChime() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const notes = [440, 554.37, 659.25, 880];
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, now + i * 0.07);
      gain.gain.setValueAtTime(0.01, now + i * 0.07);
      gain.gain.linearRampToValueAtTime(0.35, now + i * 0.07 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.07 + 0.25);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + i * 0.07);
      osc.stop(now + i * 0.07 + 0.28);
    });
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      navigator.vibrate([60, 40, 60]);
    }
  } catch {
    /* ignore */
  }
}

/** Play Offline descending chime */
export function playOfflineChime() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const notes = [659.25, 554.37, 440];
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, now + i * 0.09);
      gain.gain.setValueAtTime(0.01, now + i * 0.09);
      gain.gain.linearRampToValueAtTime(0.25, now + i * 0.09 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.09 + 0.22);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + i * 0.09);
      osc.stop(now + i * 0.09 + 0.25);
    });
  } catch {
    /* ignore */
  }
}

/** Play Cash Ka-Ching on order completion */
export function playCashKaChingChime() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const notes = [987.77, 1318.51, 1975.53];
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(freq, now + i * 0.06);
      gain.gain.setValueAtTime(0.01, now + i * 0.06);
      gain.gain.linearRampToValueAtTime(0.45, now + i * 0.06 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.06 + 0.4);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + i * 0.06);
      osc.stop(now + i * 0.06 + 0.45);
    });
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      navigator.vibrate([100, 50, 100, 50, 200]);
    }
  } catch {
    /* ignore */
  }
}

