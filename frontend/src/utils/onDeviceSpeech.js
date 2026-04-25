// On-device speech-to-text wrapper for Voices of Home.
//
// Zetic / Melange challenge integration:
// - When Voices of Home is embedded in a Zetic Melange-wrapped mobile app,
//   window.Melange.whisper is available and runs Whisper ENTIRELY on-device
//   (NPU-accelerated on-device inference). No audio leaves the phone.
// - In a standard browser (this demo), we fall back to the browser's
//   Web Speech API. For desktop Safari this is on-device; in Chrome it is
//   Google-hosted. The UI discloses this honestly.
//
// The Listen / synthesis path (ElevenLabs) is always server-side — but
// the SYMPTOM input path is the sensitive one, and that's what Zetic
// protects.

const SPEECH_LANG_MAP = {
  vi: "vi-VN",
  es: "es-US",
  ht: "fr-HT",
  hi: "hi-IN",
  zh: "zh-CN",
  tl: "fil-PH",
  ko: "ko-KR",
  ar: "ar-SA",
  fa: "fa-IR",
  en: "en-US",
};

export function hasOnDeviceMelange() {
  return typeof window !== "undefined" && !!(window.Melange && window.Melange.whisper);
}

export function hasWebSpeechAPI() {
  return typeof window !== "undefined" && !!(window.SpeechRecognition || window.webkitSpeechRecognition);
}

export function getSpeechCapability() {
  if (hasOnDeviceMelange()) {
    return { available: true, onDevice: true, label: "Zetic Melange (Whisper NPU, on-device)" };
  }
  if (hasWebSpeechAPI()) {
    return { available: true, onDevice: false, label: "Browser speech (may use cloud)" };
  }
  return { available: false, onDevice: false, label: "Not supported — please type" };
}

/**
 * Start speech-to-text.
 * @param {object} opts
 * @param {string} opts.languageCode - our internal code like "vi"
 * @param {function} opts.onInterim  - called with partial transcript
 * @param {function} opts.onFinal    - called with final transcript
 * @param {function} opts.onError    - called with error
 * @returns {{stop: () => void}}
 */
export function startSpeechRecognition({ languageCode, onInterim, onFinal, onError }) {
  // Preferred: Zetic Melange on-device Whisper
  if (hasOnDeviceMelange()) {
    const session = window.Melange.whisper.start({
      language: languageCode,
      onPartial: (t) => onInterim?.(t),
      onResult: (t) => onFinal?.(t),
      onError: (e) => onError?.(e),
    });
    return { stop: () => session.stop() };
  }

  // Fallback: browser Web Speech API
  if (!hasWebSpeechAPI()) {
    onError?.(new Error("Speech not supported in this browser. Please type."));
    return { stop: () => {} };
  }

  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  const recognition = new SR();
  recognition.lang = SPEECH_LANG_MAP[languageCode] || "en-US";
  recognition.continuous = false;
  recognition.interimResults = true;

  let finalTranscript = "";
  recognition.onresult = (e) => {
    let interim = "";
    for (let i = e.resultIndex; i < e.results.length; i++) {
      const chunk = e.results[i][0].transcript;
      if (e.results[i].isFinal) finalTranscript += chunk;
      else interim += chunk;
    }
    if (interim) onInterim?.(finalTranscript + interim);
    else if (finalTranscript) onInterim?.(finalTranscript);
  };
  recognition.onerror = (ev) => {
    if (ev.error !== "no-speech" && ev.error !== "aborted") {
      onError?.(new Error(`Speech error: ${ev.error}`));
    }
  };
  recognition.onend = () => {
    if (finalTranscript.trim()) onFinal?.(finalTranscript.trim());
  };
  recognition.start();
  return { stop: () => recognition.stop() };
}
