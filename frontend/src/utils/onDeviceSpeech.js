// On-device speech-to-text wrapper for Voices of Home.
//
// In browsers that expose a local SpeechRecognition implementation this can
// stay on-device; in others it may use a cloud speech provider. The UI
// discloses that capability honestly.

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

export function hasWebSpeechAPI() {
  return typeof window !== "undefined" && !!(window.SpeechRecognition || window.webkitSpeechRecognition);
}

export function getSpeechCapability() {
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
