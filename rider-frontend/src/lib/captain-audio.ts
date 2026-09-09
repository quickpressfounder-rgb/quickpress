/**
 * Web Audio API synthesized sounds, speech alerts & haptic feedback for Delivery Captains.
 * 100% offline & client-synthesized — zero audio file latency or external network dependencies!
 */

let activeAudioCtx: AudioContext | null = null;
let activeSirenOsc1: OscillatorNode | null = null;
let activeSirenOsc2: OscillatorNode | null = null;
let activeSirenInterval: any = null;

const AUDIO_MUTED_KEY = "qp_captain_audio_muted";
const AUDIO_LANG_KEY = "qp_captain_audio_lang";

/** Check if audio alerts are muted by user */
export function isAudioMuted(): boolean {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(AUDIO_MUTED_KEY) === "1";
}

/** Set audio mute state */
export function setAudioMuted(muted: boolean): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(AUDIO_MUTED_KEY, muted ? "1" : "0");
  if (muted) {
    stopOrderAlertSound();
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
  }
}

/** Toggle audio mute state and return new state */
export function toggleAudioMuted(): boolean {
  const current = isAudioMuted();
  const next = !current;
  setAudioMuted(next);
  triggerHaptic(next ? [80] : [80, 40, 100]);
  if (!next) {
    speakText("ऑडियो सक्रिय है", true);
  }
  return next;
}

/** Get preferred audio language */
export function getAudioLanguage(): "hi-IN" | "en-IN" {
  if (typeof window === "undefined") return "hi-IN";
  const stored = window.localStorage.getItem(AUDIO_LANG_KEY);
  return stored === "en-IN" ? "en-IN" : "hi-IN";
}

/** Set preferred audio language */
export function setAudioLanguage(lang: "hi-IN" | "en-IN"): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(AUDIO_LANG_KEY, lang);
}

export function unlockAudioContext(): void {
  if (typeof window === "undefined") return;
  try {
    const ctx = getAudioContext();
    if (ctx && ctx.state === "suspended") {
      void ctx.resume();
    }
  } catch {
    /* ignore */
  }
}

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return null;
    if (!activeAudioCtx || activeAudioCtx.state === "closed") {
      activeAudioCtx = new AudioCtx();
    }
    if (activeAudioCtx.state === "suspended") {
      void activeAudioCtx.resume();
    }
    return activeAudioCtx;
  } catch {
    return null;
  }
}

/**
 * Trigger bike phone vibration (if supported by device)
 */
export function triggerHaptic(pattern: number | number[] = [100, 50, 100]) {
  if (typeof window !== "undefined" && "vibrate" in navigator) {
    try {
      navigator.vibrate(pattern);
    } catch {
      /* ignore */
    }
  }
}

/**
 * Loud pulsing dual-tone siren for incoming order dispatch.
 * Alerts the rider immediately even while riding in loud traffic!
 */
export function playOrderAlertSound() {
  if (isAudioMuted()) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  triggerHaptic([200, 100, 200, 100, 400]);

  try {
    stopOrderAlertSound();

    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gainNode = ctx.createGain();

    osc1.type = "sawtooth";
    osc2.type = "sine";

    osc1.connect(gainNode);
    osc2.connect(gainNode);
    gainNode.connect(ctx.destination);

    // Initial frequencies (A5 & D6)
    osc1.frequency.setValueAtTime(880, ctx.currentTime);
    osc2.frequency.setValueAtTime(1174.66, ctx.currentTime);

    gainNode.gain.setValueAtTime(0.35, ctx.currentTime);

    // Pulse siren rhythm
    let high = false;
    activeSirenInterval = setInterval(() => {
      if (!ctx || ctx.state === "closed") return;
      const now = ctx.currentTime;
      high = !high;
      if (high) {
        osc1.frequency.exponentialRampToValueAtTime(1318.51, now + 0.1); // E6
        osc2.frequency.exponentialRampToValueAtTime(1760.0, now + 0.1); // A6
      } else {
        osc1.frequency.exponentialRampToValueAtTime(880.0, now + 0.1); // A5
        osc2.frequency.exponentialRampToValueAtTime(1174.66, now + 0.1); // D6
      }
    }, 180);

    osc1.start();
    osc2.start();

    activeSirenOsc1 = osc1;
    activeSirenOsc2 = osc2;

    // Auto-stop after 12 seconds if not accepted
    setTimeout(() => {
      stopOrderAlertSound();
    }, 12000);
  } catch (err) {
    console.warn("Audio synthesis error:", err);
  }
}

/**
 * Stop siren when order is accepted or rejected.
 */
export function stopOrderAlertSound() {
  if (activeSirenInterval) {
    clearInterval(activeSirenInterval);
    activeSirenInterval = null;
  }
  if (activeSirenOsc1) {
    try {
      activeSirenOsc1.stop();
    } catch {}
    activeSirenOsc1 = null;
  }
  if (activeSirenOsc2) {
    try {
      activeSirenOsc2.stop();
    } catch {}
    activeSirenOsc2 = null;
  }
}

/**
 * Sound chime when duty is toggled ON / OFF.
 */
export function playDutyToggleSound(isOnline: boolean) {
  if (isAudioMuted()) return;
  const ctx = getAudioContext();
  if (!ctx) return;
  triggerHaptic(isOnline ? [80, 40, 120] : [150]);

  try {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.type = "sine";
    if (isOnline) {
      // Ascending pleasant arpeggio (Going Online)
      osc.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
      osc.frequency.exponentialRampToValueAtTime(659.25, ctx.currentTime + 0.12); // E5
      osc.frequency.exponentialRampToValueAtTime(783.99, ctx.currentTime + 0.25); // G5
    } else {
      // Descending tone (Going Offline)
      osc.frequency.setValueAtTime(659.25, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(440.0, ctx.currentTime + 0.25);
    }

    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);

    osc.start();
    osc.stop(ctx.currentTime + 0.3);
  } catch {
    /* ignore */
  }
}

/**
 * Arrival chime when Captain reaches pickup or drop location.
 */
export function playArrivalChime() {
  if (isAudioMuted()) return;
  const ctx = getAudioContext();
  if (!ctx) return;
  triggerHaptic([120, 80, 150]);

  try {
    const notes = [587.33, 739.99, 880.0]; // D5, F#5, A5
    notes.forEach((freq, index) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, ctx.currentTime + index * 0.09);

      gain.gain.setValueAtTime(0, ctx.currentTime + index * 0.09);
      gain.gain.linearRampToValueAtTime(0.25, ctx.currentTime + index * 0.09 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + index * 0.09 + 0.35);

      osc.start(ctx.currentTime + index * 0.09);
      osc.stop(ctx.currentTime + index * 0.09 + 0.35);
    });
  } catch {
    /* ignore */
  }
}

/**
 * Triumphant chord chime for order pickup or delivery completed!
 */
export function playSuccessChime() {
  if (isAudioMuted()) return;
  const ctx = getAudioContext();
  if (!ctx) return;
  triggerHaptic([100, 60, 100, 60, 200]);

  try {
    const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
    notes.forEach((freq, index) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, ctx.currentTime + index * 0.08);

      gain.gain.setValueAtTime(0, ctx.currentTime + index * 0.08);
      gain.gain.linearRampToValueAtTime(0.22, ctx.currentTime + index * 0.08 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + index * 0.08 + 0.4);

      osc.start(ctx.currentTime + index * 0.08);
      osc.stop(ctx.currentTime + index * 0.08 + 0.4);
    });
  } catch {
    /* ignore */
  }
}

/**
 * Web Speech API Voice synthesis helper (Hindi / Indian English).
 */
export function speakText(text: string, force: boolean = false) {
  if (isAudioMuted() && !force) return;
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;

  try {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    const lang = getAudioLanguage();
    utterance.lang = lang;
    utterance.rate = 1.05;
    utterance.pitch = 1.0;

    const voices = window.speechSynthesis.getVoices();
    if (voices && voices.length > 0) {
      if (lang.startsWith("hi")) {
        const hindiVoice = voices.find(
          (v) => v.lang === "hi-IN" || v.name.toLowerCase().includes("hindi") || v.lang.startsWith("hi")
        );
        if (hindiVoice) utterance.voice = hindiVoice;
      } else {
        const engVoice = voices.find(
          (v) => v.lang === "en-IN" || v.lang === "en-US" || v.lang.startsWith("en")
        );
        if (engVoice) utterance.voice = engVoice;
      }
    }

    window.speechSynthesis.speak(utterance);
  } catch (err) {
    console.warn("Speech synthesis error:", err);
  }
}

/**
 * Spoken alert when a new ride/order is dispatched.
 */
export function speakOrderAlert(fare: number, pickupTitle?: string, dropTitle?: string) {
  const isHi = getAudioLanguage().startsWith("hi");
  const text = isHi
    ? `नया ऑर्डर! किराया ${fare} रुपये। ${pickupTitle ? pickupTitle + " से पिकअप करें।" : "जल्दी स्वीकार करें।"}`
    : `New order! Earning ${fare} rupees. ${pickupTitle ? "Pickup from " + pickupTitle : "Accept now."}`;
  speakText(text);
}

/**
 * Spoken alert when duty status changes.
 */
export function speakDutyStatus(isOnline: boolean) {
  const isHi = getAudioLanguage().startsWith("hi");
  const text = isOnline
    ? isHi
      ? "कप्तान ड्यूटी ऑन हो गई है। ऑर्डर्स के लिए तैयार रहें।"
      : "Captain is now ON DUTY. Ready for new orders."
    : isHi
      ? "कप्तान ड्यूटी ऑफ हो गई है।"
      : "Captain is now OFF DUTY.";
  speakText(text, true);
}

/**
 * Spoken alert upon arrival.
 */
export function speakArrival(placeName: string = "स्थान") {
  const isHi = getAudioLanguage().startsWith("hi");
  const text = isHi
    ? `आप ${placeName} पर पहुँच गए हैं!`
    : `You have arrived at ${placeName}!`;
  speakText(text);
}

/**
 * Spoken alert on trip completion.
 */
export function speakTripComplete(earnings?: number) {
  const isHi = getAudioLanguage().startsWith("hi");
  const text = isHi
    ? `डिलीवरी पूरी हो गई! ${earnings ? earnings + " रुपये आपके वॉलेट में जोड़ दिए गए हैं।" : "शाबाश कप्तान!"}`
    : `Delivery completed! ${earnings ? earnings + " rupees added to wallet." : "Great job Captain!"}`;
  speakText(text);
}

/**
 * Spoken alert when clothes dropped at store and partner starts processing.
 */
export function speakStoreProcessingStarted(minutes: number = 120) {
  const isHi = getAudioLanguage().startsWith("hi");
  const text = isHi
    ? `कपड़े पार्टनर स्टोर में जमा हो गए हैं। कपड़े धुलने का अनुमानित समय लगभग ${minutes} मिनट है।`
    : `Laundry dropped at store. Cleaning cycle started, estimated ${minutes} minutes.`;
  speakText(text, true);
}

/**
 * Spoken alert when partner completes processing: Laundry is ready for delivery pickup!
 */
export function speakLaundryReadyForDelivery() {
  const isHi = getAudioLanguage().startsWith("hi");
  const text = isHi
    ? "अलर्ट! कपड़े तैयार हैं! पार्टनर स्टोर पहुंचकर पार्सल कलेक्ट करें।"
    : "Alert! Laundry is ready at store. Head to partner store to collect package.";
  speakText(text, true);
}

/**
 * Spoken reminder to tell Dispatch OTP to partner.
 */
export function speakDispatchOtpPrompt(otp?: string) {
  const isHi = getAudioLanguage().startsWith("hi");
  const text = isHi
    ? `पार्टनर को अपना 4-अंकीय डिस्पैच कोड ${otp ? otp.split("").join(" ") : ""} बताएं।`
    : `Tell your 4-digit Dispatch code ${otp || ""} to the Partner.`;
  speakText(text, true);
}

/**
 * Spoken alert when partner verifies dispatch OTP.
 */
export function speakDispatchOtpVerified() {
  const isHi = getAudioLanguage().startsWith("hi");
  const text = isHi
    ? "डिस्पैच कोड सत्यापित हो गया है! कस्टमर के घर डिलीवरी शुरू करें।"
    : "Dispatch OTP verified! Start trip to customer doorstep.";
  speakText(text, true);
}

/**
 * Spoken reminder to collect Customer Delivery OTP at doorstep.
 */
export function speakCustomerDeliveryOtpPrompt() {
  const isHi = getAudioLanguage().startsWith("hi");
  const text = isHi
    ? "आप कस्टमर के घर पहुँच गए हैं। कस्टमर से 4-अंकीय डिलीवरी कोड लें।"
    : "You have arrived at customer doorstep. Ask customer for 4-digit delivery OTP.";
  speakText(text, true);
}

/**
 * Spoken reminder to collect Pickup OTP from customer.
 */
export function speakPickupOtpPrompt() {
  const isHi = getAudioLanguage().startsWith("hi");
  const text = isHi
    ? "आप कस्टमर के घर पहुँच गए हैं। कपड़े लेकर 4-अंकीय पिकअप कोड लें।"
    : "Arrived at customer pickup. Collect garments and ask for 4-digit pickup code.";
  speakText(text, true);
}
