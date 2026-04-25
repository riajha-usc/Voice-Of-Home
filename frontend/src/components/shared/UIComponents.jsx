import { useState, useRef } from "react";
import { Volume2, Play, Pause } from "lucide-react";
import { translations, t, isRTL } from "../../utils/translations";
import { api } from "../../utils/api";

const LANGUAGES = [
  { code: "vi", name: "Vietnamese", native: "Tiếng Việt" },
  { code: "es", name: "Spanish", native: "Español" },
  { code: "ht", name: "Haitian Creole", native: "Kreyòl" },
  { code: "hi", name: "Hindi", native: "हिन्दी" },
  { code: "zh", name: "Mandarin", native: "中文" },
  { code: "tl", name: "Tagalog", native: "Tagalog" },
  { code: "ko", name: "Korean", native: "한국어" },
  { code: "ar", name: "Arabic", native: "العربية" },
  { code: "fa", name: "Farsi", native: "فارسی" },
  { code: "en", name: "English", native: "English" },
];

export function getLanguageName(code) {
  return LANGUAGES.find((l) => l.code === code)?.name || code;
}

export function getLanguageNative(code) {
  return LANGUAGES.find((l) => l.code === code)?.native || code;
}

export function LanguageSelector({ selected, onSelect }) {
  return (
    <div className="flex flex-wrap gap-2">
      {LANGUAGES.map((lang) => (
        <button
          key={lang.code}
          onClick={() => onSelect(lang.code)}
          className={`lang-pill ${selected === lang.code ? "active" : ""}`}
        >
          {lang.native}
        </button>
      ))}
    </div>
  );
}

export function LoadingDots({ text = "Analyzing" }) {
  return (
    <div className="flex items-center gap-2 text-sm py-4" style={{ color: "var(--color-slate-400)" }}>
      <div className="spinner" />
      <span>{text}...</span>
    </div>
  );
}

// ListenButton — calls /api/voice/generate to get audio for given text + language
export function ListenButton({ text, languageCode, label, compact = false }) {
  const [state, setState] = useState("idle"); // idle | loading | playing | error
  const audioRef = useRef(null);
  const rtl = isRTL(languageCode);

  const handleClick = async () => {
    if (!text) return;
    if (state === "playing" && audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setState("idle");
      return;
    }
    setState("loading");
    try {
      const data = await api.generateVoice(text, languageCode, null, "custom");
      if (!data.audio_base64) {
        setState("error");
        return;
      }
      audioRef.current = new Audio(`data:audio/mpeg;base64,${data.audio_base64}`);
      audioRef.current.onended = () => setState("idle");
      audioRef.current.onerror = () => setState("error");
      await audioRef.current.play();
      setState("playing");
    } catch {
      setState("error");
    }
  };

  const effectiveLabel = label || t(languageCode, "symptoms_listen");

  return (
    <button
      onClick={handleClick}
      disabled={state === "loading" || !text}
      className="flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-all"
      dir={rtl ? "rtl" : "ltr"}
      style={{
        background: state === "playing" ? "var(--color-coral-400)" : "var(--color-coral-50)",
        color: state === "playing" ? "white" : "var(--color-coral-500)",
        border: "1px solid var(--color-coral-200)",
        cursor: state === "loading" ? "wait" : "pointer",
      }}
    >
      {state === "loading" ? (
        <div className="spinner" style={{ width: 14, height: 14, borderTopColor: "var(--color-coral-500)" }} />
      ) : state === "playing" ? (
        <Pause size={14} />
      ) : (
        <Volume2 size={14} />
      )}
      {!compact && <span>{effectiveLabel}</span>}
      {state === "error" && <span className="text-xs">•</span>}
    </button>
  );
}

export function PatientConfirmation({ languageCode, extraText }) {
  const text = t(languageCode, "symptoms_understood");
  const rtl = isRTL(languageCode);
  return (
    <div className="alert-success p-4" dir={rtl ? "rtl" : "ltr"}>
      <div className="flex flex-col items-center gap-3">
        <p className="text-lg font-medium text-center" style={{ color: "var(--color-teal-700)" }}>{text}</p>
        {extraText && (
          <p className="text-sm text-center" style={{ color: "var(--color-teal-600)", lineHeight: 1.6 }}>{extraText}</p>
        )}
        <div className="flex items-center gap-2">
          <ListenButton text={`${text}${extraText ? " " + extraText : ""}`} languageCode={languageCode} />
          <span className="text-xs" style={{ color: "var(--color-teal-600)" }}>
            {getLanguageName(languageCode)}
          </span>
        </div>
      </div>
    </div>
  );
}
