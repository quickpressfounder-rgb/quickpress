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

// Cached Blob URL for synthesized on-the-road radar siren WAV
let cachedBellWavUrl: string | null = null;

function getBellChimeUrl(): string {
  if (cachedBellWavUrl) return cachedBellWavUrl;
  try {
    const sampleRate = 22050;
    const duration = 1.05;
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
    view.setUint16(22, 1, true); // mono
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

      // Sub-bass physical thump (0.0s - 0.15s)
      if (t >= 0 && t < 0.15) {
        const decay = Math.exp(-t * 22.0);
        sample += Math.sin(2 * Math.PI * 120.0 * t) * 0.45 * decay;
      }

      // Chirp 1: Rapid rising radar sweep 1760 Hz -> 2349 Hz (0.0s - 0.12s)
      if (t >= 0 && t < 0.12) {
        const dt = t;
        const freq = 1760.0 + (2349.0 - 1760.0) * (dt / 0.12);
        const decay = Math.exp(-dt * 4.0);
        sample += Math.sin(2 * Math.PI * freq * dt) * 0.65 * decay;
      }

      // Chirp 2: High piercing sweep 2349 Hz -> 3136 Hz (0.16s - 0.30s)
      if (t >= 0.16 && t < 0.3) {
        const dt = t - 0.16;
        const freq = 2349.0 + (3136.0 - 2349.0) * (dt / 0.14);
        const decay = Math.exp(-dt * 4.0);
        sample += Math.sin(2 * Math.PI * freq * dt) * 0.75 * decay;
      }

      // Triple Staccato Attention Pulses (0.36s, 0.48s, 0.60s)
      const staccatoTimes = [0.36, 0.48, 0.6];
      for (const st of staccatoTimes) {
        if (t >= st && t < st + 0.08) {
          const dt = t - st;
          const decay = Math.exp(-dt * 18.0);
          sample +=
            (Math.sin(2 * Math.PI * 2793.82 * dt) * 0.7 +
              Math.sin(2 * Math.PI * 5587.64 * dt) * 0.25) *
            decay;
        }
      }

      const intSample = Math.max(-1, Math.min(1, sample)) * 32767;
      view.setInt16(offset, intSample, true);
      offset += 2;
    }

    const blob = new Blob([buffer], { type: "audio/wav" });
    cachedBellWavUrl = URL.createObjectURL(blob);
    return cachedBellWavUrl;
  } catch {
    return "";
  }
}

let isGlobalUnlockerInstalled = false;

/** Installs global one-shot interaction listeners on window to warm up audio on first touch */
export function installGlobalAudioUnlocker(): void {
  if (typeof window === "undefined" || isGlobalUnlockerInstalled) return;
  isGlobalUnlockerInstalled = true;

  const onUserInteraction = () => {
    unlockAudioContext();
    window.removeEventListener("pointerdown", onUserInteraction);
    window.removeEventListener("touchstart", onUserInteraction);
    window.removeEventListener("click", onUserInteraction);
    window.removeEventListener("keydown", onUserInteraction);
  };

  window.addEventListener("pointerdown", onUserInteraction, { passive: true });
  window.addEventListener("touchstart", onUserInteraction, { passive: true });
  window.addEventListener("click", onUserInteraction, { passive: true });
  window.addEventListener("keydown", onUserInteraction, { passive: true });
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

  // Pre-instantiate and prime HTML5 Audio element
  try {
    if (!activeBellAudio) {
      const url = getBellChimeUrl();
      if (url) {
        activeBellAudio = new Audio(url);
        activeBellAudio.preload = "auto";
        activeBellAudio.volume = 1.0;
      }
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

let activeBellInterval: any = null;
let activeBellAudio: HTMLAudioElement | null = null;

// High-Urgency Dispatch Radar Pulse & Accelerating Siren (On-The-Road Pro Rider)
function playCaptainRadarSiren(ctx: AudioContext) {
  if (!ctx || ctx.state === "closed") return;
  if (ctx.state === "suspended") {
    void ctx.resume();
  }
  const now = ctx.currentTime;

  // 1. Sub-bass speaker thump (120Hz)
  try {
    const subOsc = ctx.createOscillator();
    const subGain = ctx.createGain();
    subOsc.type = "sine";
    subOsc.frequency.setValueAtTime(120, now);
    subGain.gain.setValueAtTime(0.001, now);
    subGain.gain.linearRampToValueAtTime(0.5, now + 0.005);
    subGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.15);
    subOsc.connect(subGain);
    subGain.connect(ctx.destination);
    subOsc.start(now);
    subOsc.stop(now + 0.16);
  } catch {}

  // 2. Chirp 1 (1760Hz -> 2349Hz, sawtooth)
  try {
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = "sawtooth";
    osc1.frequency.setValueAtTime(1760, now);
    osc1.frequency.exponentialRampToValueAtTime(2349, now + 0.12);
    gain1.gain.setValueAtTime(0.001, now);
    gain1.gain.linearRampToValueAtTime(0.55, now + 0.01);
    gain1.gain.exponentialRampToValueAtTime(0.0001, now + 0.14);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.15);
  } catch {}

  // 3. Chirp 2 (2349Hz -> 3136Hz, high triangle)
  try {
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = "triangle";
    osc2.frequency.setValueAtTime(2349, now + 0.16);
    osc2.frequency.exponentialRampToValueAtTime(3136, now + 0.29);
    gain2.gain.setValueAtTime(0.001, now + 0.16);
    gain2.gain.linearRampToValueAtTime(0.65, now + 0.17);
    gain2.gain.exponentialRampToValueAtTime(0.0001, now + 0.31);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.16);
    osc2.stop(now + 0.32);
  } catch {}

  // 4. Triple Staccato Attention Pulses (2793.82 Hz - F7)
  [0.36, 0.48, 0.6].forEach((offset) => {
    try {
      const oscP = ctx.createOscillator();
      const gainP = ctx.createGain();
      oscP.type = "sine";
      oscP.frequency.setValueAtTime(2793.82, now + offset);
      gainP.gain.setValueAtTime(0.001, now + offset);
      gainP.gain.linearRampToValueAtTime(0.7, now + offset + 0.005);
      gainP.gain.exponentialRampToValueAtTime(0.0001, now + offset + 0.08);
      oscP.connect(gainP);
      gainP.connect(ctx.destination);
      oscP.start(now + offset);
      oscP.stop(now + offset + 0.09);
    } catch {}
  });
}

/**
 * Loud, continuous on-the-road radar dispatch siren for assigned trips & offers.
 * Pierces through helmet, heavy traffic, and pocket environments!
 */
export function playOrderAlertSound() {
  if (isAudioMuted()) return;

  unlockAudioContext();
  triggerHaptic([450, 100, 450, 100, 800, 200, 800]);

  try {
    stopOrderAlertSound();

    // Engine 1: Web Audio API Oscillator synthesizer
    const ctx = getAudioContext();
    if (ctx) {
      if (ctx.state === "suspended") {
        void ctx.resume();
      }
      playCaptainRadarSiren(ctx);

      activeBellInterval = setInterval(() => {
        if (!ctx || ctx.state === "closed") return;
        playCaptainRadarSiren(ctx);
        triggerHaptic([450, 100, 450, 100, 800, 200, 800]);
      }, 1050);
    }

    // Engine 2: Native HTML5 Audio with embedded WAV chime (Guaranteed fallback when AudioContext is suspended)
    try {
      const chimeUrl = getBellChimeUrl();
      if (chimeUrl) {
        if (!activeBellAudio) {
          activeBellAudio = new Audio(chimeUrl);
        } else {
          activeBellAudio.src = chimeUrl;
        }
        activeBellAudio.loop = true;
        activeBellAudio.volume = 1.0;
        void activeBellAudio.play().catch(() => {});
      }
    } catch {
      /* ignore audio element errors */
    }

    // Auto-stop after 30 seconds safety timeout if not interacted
    setTimeout(() => {
      stopOrderAlertSound();
    }, 30000);
  } catch (err) {
    console.warn("Audio synthesis error:", err);
  }
}

/** Alias for playOrderAlertSound focusing on direct assignment */
export function playTripAssignedBell() {
  playOrderAlertSound();
}

/**
 * Stop bell ringtone when trip is acknowledged, navigated, or accepted.
 */
export function stopOrderAlertSound() {
  if (activeBellInterval) {
    clearInterval(activeBellInterval);
    activeBellInterval = null;
  }
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
  if (activeBellAudio) {
    try {
      activeBellAudio.pause();
      activeBellAudio.currentTime = 0;
    } catch {}
    activeBellAudio = null;
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
 * Spoken alert when a trip is DIRECTLY ASSIGNED to the captain.
 */
export function speakTripAssigned(fare: number, pickupTitle?: string) {
  const isHi = getAudioLanguage().startsWith("hi");
  const text = isHi
    ? `नया ट्रिप असाइन हो गया है! किराया ${fare} रुपये। तुरंत पिकअप के लिए रवाना हों।`
    : `New trip assigned! Earning ${fare} rupees. Head to pickup immediately.`;
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

/**
 * Test preview of the On-The-Road Dispatch Radar Siren.
 * Rings for 4 seconds then automatically silences.
 */
export function testCaptainAlertSound(onFinished?: () => void): () => void {
  playOrderAlertSound();
  const timer = setTimeout(() => {
    stopOrderAlertSound();
    if (onFinished) onFinished();
  }, 4000);

  return () => {
    clearTimeout(timer);
    stopOrderAlertSound();
  };
}
