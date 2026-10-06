/**
 * QuickPress Partner — Zomato / Swiggy style Merchant Order Alarm System.
 *
 * Provides:
 * 1. Web Audio API continuous synthetic alarm (no mp3 file asset dependencies).
 * 2. Background audio persistence via web audio loop.
 * 3. Haptic vibration patterns on supported mobile devices.
 * 4. Desktop/Browser native Notification API integration.
 */

let audioCtx: AudioContext | null = null;
let alarmIntervalId: ReturnType<typeof setInterval> | null = null;
let isRinging = false;

function getAudioContext(): AudioContext {
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    audioCtx = new AudioContextClass();
  }
  if (audioCtx.state === "suspended") {
    void audioCtx.resume();
  }
  return audioCtx;
}

/**
 * Ensures audio context is unlocked by user interaction.
 */
export function unlockAudio(): void {
  try {
    const ctx = getAudioContext();
    if (ctx.state === "suspended") {
      void ctx.resume();
    }
  } catch {
    // Ignore autoplay restriction before user interaction
  }
}

if (typeof window !== "undefined") {
  const unlock = () => {
    unlockAudio();
    window.removeEventListener("click", unlock);
    window.removeEventListener("touchstart", unlock);
    window.removeEventListener("keydown", unlock);
  };
  window.addEventListener("click", unlock, { once: true, passive: true });
  window.addEventListener("touchstart", unlock, { once: true, passive: true });
  window.addEventListener("keydown", unlock, { once: true, passive: true });
}

/**
 * Plays a single multi-tone Zomato/Swiggy merchant chime burst.
 */
function playToneBurst() {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;

    // Dual-tone harmonic bell alert (880Hz / 1174Hz / 1760Hz - A5, D6, A6)
    const tones = [
      { freq: 880, start: 0, dur: 0.18, vol: 0.8 },
      { freq: 1174.66, start: 0.15, dur: 0.22, vol: 0.9 },
      { freq: 1760, start: 0.35, dur: 0.35, vol: 1.0 },
      { freq: 1396.91, start: 0.65, dur: 0.45, vol: 0.9 },
    ];

    tones.forEach(({ freq, start, dur, vol }) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, now + start);

      gain.gain.setValueAtTime(0.01, now + start);
      gain.gain.exponentialRampToValueAtTime(vol, now + start + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, now + start + dur);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + start);
      osc.stop(now + start + dur);
    });
  } catch (err) {
    console.warn("[order-alarm] Audio playback error:", err);
  }
}

import {
  playPartnerOrderChime,
  startPartnerOrderAlertRing,
  stopPartnerOrderAlertRing,
  triggerPartnerHaptic,
} from "./partner-order-alert-sound";

/**
 * Plays continuous looping order alarm (Commercial Store Alert) until explicitly stopped.
 */
export function startOrderAlarm(orderCode?: string) {
  if (isRinging) return;
  isRinging = true;

  startPartnerOrderAlertRing();
  triggerDesktopNotification(orderCode);
}

/**
 * Stops the ringing alarm immediately.
 */
export function stopOrderAlarm() {
  isRinging = false;
  stopPartnerOrderAlertRing();
}

export function isAlarmRinging(): boolean {
  return isRinging;
}

/**
 * Requests browser desktop notification permissions and fires alert.
 */
export function requestNotificationPermission(): void {
  if (typeof window !== "undefined" && "Notification" in window) {
    if (Notification.permission === "default") {
      void Notification.requestPermission();
    }
  }
}

function triggerDesktopNotification(orderCode?: string) {
  if (typeof window === "undefined" || !("Notification" in window)) return;

  if (Notification.permission === "granted") {
    try {
      const title = `🚨 NEW ORDER RECEIVED #${orderCode || "QuickPress"}`;
      const options: NotificationOptions = {
        body: "Tap to review items and accept incoming order now.",
        icon: "/favicon.ico",
        tag: `order-${orderCode || Date.now()}`,
        requireInteraction: true,
      };
      const n = new Notification(title, options);
      n.onclick = () => {
        window.focus();
        n.close();
      };
    } catch {
      // Ignore notification failures
    }
  } else if (Notification.permission === "default") {
    void Notification.requestPermission();
  }
}
