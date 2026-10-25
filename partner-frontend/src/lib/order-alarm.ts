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

function hasUserGesture(): boolean {
  if (typeof window === "undefined" || typeof navigator === "undefined") return false;
  if ("userActivation" in navigator && (navigator as any).userActivation) {
    return Boolean((navigator as any).userActivation.hasBeenActive);
  }
  return true;
}

function getAudioContext(): AudioContext {
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    audioCtx = new AudioContextClass();
  }
  if (audioCtx.state === "suspended") {
    if (hasUserGesture()) {
      void audioCtx.resume().catch(() => {});
    }
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
 * Triggers native Android background audio on STREAM_ALARM with wakeScreen and heads-up notification,
 * plus Web Audio and HTML5 audio fallbacks.
 */
export function startOrderAlarm(
  orderCode?: string,
  amount?: number | string,
  customerName?: string
) {
  if (isRinging) return;
  isRinging = true;

  // 1. Android Native Background Ring (Plays loud on STREAM_ALARM + wake screen + heads-up notification)
  if (typeof window !== "undefined" && (window as any).QuickPressNativeBridge?.startBackgroundOrderRing) {
    try {
      (window as any).QuickPressNativeBridge.startBackgroundOrderRing(
        orderCode || "",
        amount != null ? String(amount) : "",
        customerName || ""
      );
    } catch (e) {
      console.warn("[order-alarm] Native startBackgroundOrderRing error:", e);
    }
  }

  // 2. High-Priority Web Audio & HTML5 fallback
  startPartnerOrderAlertRing();

  // 3. Desktop / Mobile Browser Notification
  triggerDesktopNotification(orderCode, amount, customerName);
}

/**
 * Stops the ringing alarm immediately across native bridge and web audio.
 */
export function stopOrderAlarm() {
  isRinging = false;

  // 1. Stop Native Android Background Ring
  if (typeof window !== "undefined" && (window as any).QuickPressNativeBridge?.stopBackgroundOrderRing) {
    try {
      (window as any).QuickPressNativeBridge.stopBackgroundOrderRing();
    } catch (e) {
      console.warn("[order-alarm] Native stopBackgroundOrderRing error:", e);
    }
  }

  // 2. Stop Web Audio & HTML5 Audio
  stopPartnerOrderAlertRing();
}

export function isAlarmRinging(): boolean {
  return isRinging;
}

let activeStatusNotification: Notification | null = null;

/**
 * Synchronizes store online/offline status with native Android notification tray
 * and Web Notifications (Exact Zomato Style: "🔴 Your store is temporarily offline").
 */
export function syncStoreStatusNotification(isOnline: boolean) {
  if (typeof window === "undefined") return;

  // 1. Native Android Bridge (Status Bar persistent notification with Go Online action button)
  if ((window as any).QuickPressNativeBridge?.postStoreStatusNotification) {
    try {
      if (!isOnline) {
        (window as any).QuickPressNativeBridge.postStoreStatusNotification(
          "🔴 Your store is temporarily offline",
          "Go online now to receive orders",
          true
        );
      } else {
        (window as any).QuickPressNativeBridge.clearStoreStatusNotification();
      }
    } catch (e) {
      console.warn("[order-alarm] Native postStoreStatusNotification error:", e);
    }
  }

  // 2. Web Browser Notification fallback
  if ("Notification" in window) {
    if (Notification.permission === "granted") {
      try {
        if (!isOnline) {
          if (activeStatusNotification) {
            try {
              activeStatusNotification.close();
            } catch {}
          }
          activeStatusNotification = new Notification("🔴 Your store is temporarily offline", {
            body: "Go online now to receive orders",
            icon: "/app-icon.png",
            tag: "qp-store-offline-status",
            requireInteraction: true,
            silent: true,
          });
          activeStatusNotification.onclick = () => {
            window.focus();
            window.dispatchEvent(new CustomEvent("qp:partner:go_online"));
            try {
              activeStatusNotification?.close();
            } catch {}
          };
        } else {
          if (activeStatusNotification) {
            try {
              activeStatusNotification.close();
            } catch {}
            activeStatusNotification = null;
          }
        }
      } catch {}
    } else if (Notification.permission === "default" && !isOnline) {
      void Notification.requestPermission();
    }
  }
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

function triggerDesktopNotification(
  orderCode?: string,
  amount?: number | string,
  customerName?: string
) {
  if (typeof window === "undefined" || !("Notification" in window)) return;

  if (Notification.permission === "granted") {
    try {
      const code = orderCode || "NEW";
      const amtText = amount ? ` · ₹${amount}` : "";
      const custText = customerName ? ` from ${customerName}` : "";
      const title = `🚨 NEW ORDER #${code}${amtText}`;
      const options: NotificationOptions = {
        body: `Tap to accept incoming order${custText} within 5 minutes.`,
        icon: "/app-icon.png",
        tag: `order-${code}-${Date.now()}`,
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
