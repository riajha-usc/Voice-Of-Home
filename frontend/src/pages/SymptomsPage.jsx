import { useState, useRef } from "react";
import { Mic, MicOff, Search, Shield, Brain, Type, Cpu } from "lucide-react";
import { LanguageSelector, LoadingDots, PatientConfirmation } from "../components/shared/UIComponents";
import { useSession } from "../hooks/useSession";
import { api } from "../utils/api";
import { t, isRTL } from "../utils/translations";
import { startSpeechRecognition, getSpeechCapability } from "../utils/onDeviceSpeech";

export default function SymptomsPage() {
  const { session, updateLanguage, onAnalyzed } = useSession();
  const [symptomText, setSymptomText] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [patientExplanation, setPatientExplanation] = useState(null);
  const [showTextInput, setShowTextInput] = useState(false);
  const [error, setError] = useState(null);
  const recognitionRef = useRef(null);
  const rtl = isRTL(session.language);
  const speechCap = getSpeechCapability();

  const handleAnalyze = async (textOverride) => {
    const text = (textOverride ?? symptomText).trim();
    if (!text) return;
    setIsAnalyzing(true);
    setError(null);
    setPatientExplanation(null);
    try {
      const data = await api.analyzeSymptoms(text, session.language, session.sessionId);
      onAnalyzed();
      // Build a patient-facing explanation from the clinical mapping
      if (data.insights && data.insights.length > 0) {
        const first = data.insights[0];
        setPatientExplanation({
          expression: first.cultural_expression,
          mapping: first.clinical_mapping,
        });
      } else {
        setPatientExplanation({ expression: text, mapping: null });
      }
      setSymptomText("");
    } catch (err) {
      setError(err.message);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleMicToggle = () => {
    if (isRecording) {
      recognitionRef.current?.stop();
      setIsRecording(false);
      return;
    }
    if (!speechCap.available) {
      setError("Speech not supported on this device. Please type instead.");
      setShowTextInput(true);
      return;
    }
    setError(null);
    const session_ = startSpeechRecognition({
      languageCode: session.language,
      onInterim: (t) => setSymptomText(t),
      onFinal: (finalText) => {
        setIsRecording(false);
        if (finalText.trim()) handleAnalyze(finalText.trim());
      },
      onError: (err) => {
        setIsRecording(false);
        setError(err.message);
      },
    });
    recognitionRef.current = session_;
    setIsRecording(true);
  };

  const examples = [
    { text: "dife nan zo", lang: "ht", label: "Haitian Creole: Fire in my bones" },
    { text: "susto", lang: "es", label: "Spanish: Fright / soul loss" },
    { text: "con mèo ngồi trên ngực tôi", lang: "vi", label: "Vietnamese: A cat sits on my chest" },
    { text: "hwabyung", lang: "ko", label: "Korean: Fire illness" },
    { text: "पेट में आग लगती है", lang: "hi", label: "Hindi: Fire in my stomach" },
  ];

  return (
    <div className="patient-page pb-24 lg:pb-6" dir={rtl ? "rtl" : "ltr"}>
      <div className="patient-page-header">
        <div className="patient-page-title">
          <div className="patient-page-title-icon" style={{ background: "var(--color-teal-100)" }}>
            <Brain size={20} style={{ color: "var(--color-teal-600)" }} />
          </div>
          <div>
            <h1 className="text-2xl font-semibold" style={{ color: "var(--color-slate-800)" }}>{t(session.language, "symptoms_title")}</h1>
            <p className="text-sm" style={{ color: "var(--color-slate-400)" }}>{t(session.language, "symptoms_subtitle")}</p>
          </div>
        </div>
        <div className="patient-stat-grid">
          <div className="patient-stat-card">
            <p className="text-xs" style={{ color: "var(--color-slate-400)" }}>Language</p>
            <p className="text-sm font-semibold mt-1" style={{ color: "var(--color-slate-700)" }}>{session.patientContext.language}</p>
          </div>
          <div className="patient-stat-card">
            <p className="text-xs" style={{ color: "var(--color-slate-400)" }}>Session</p>
            <p className="text-sm font-semibold mt-1" style={{ color: "var(--color-slate-700)" }}>
              {session.sessionId ? session.sessionId.slice(-6).toUpperCase() : "Active"}
            </p>
          </div>
        </div>
      </div>

      <div className="patient-main-grid">
        <div className="patient-stack">
          <div className="glass-card p-4">
            <p className="text-xs font-medium mb-2" style={{ color: "var(--color-slate-400)" }}>{t(session.language, "symptoms_select_language")}</p>
            <LanguageSelector selected={session.language} onSelect={updateLanguage} />
          </div>

          {/* Speech-first input */}
          <div className="glass-card p-6">
            <div className="flex flex-col items-center gap-4">
              <button
                onClick={handleMicToggle}
                className={`mic-btn ${isRecording ? "recording" : ""}`}
                style={{ width: 88, height: 88 }}
              >
                {isRecording ? <MicOff size={34} color="white" /> : <Mic size={34} style={{ color: "var(--color-coral-400)" }} />}
              </button>
              <div className="text-center">
                <p className="text-base font-medium" style={{ color: "var(--color-slate-700)" }}>
                  {isRecording ? t(session.language, "symptoms_recording") : t(session.language, "symptoms_tap_to_speak")}
                </p>
                <div className="flex items-center justify-center gap-1.5 mt-1">
                  <Cpu size={10} style={{ color: speechCap.onDevice ? "var(--color-teal-500)" : "var(--color-slate-400)" }} />
                  <p className="text-xs" style={{ color: speechCap.onDevice ? "var(--color-teal-500)" : "var(--color-slate-400)" }}>
                    {speechCap.label}
                  </p>
                </div>
              </div>
              {symptomText && (
                <div className="w-full p-3 rounded-xl" style={{ background: "var(--color-cream-100)", border: "1px dashed var(--color-cream-300)" }}>
                  <p className="text-xs mb-1" style={{ color: "var(--color-slate-400)" }}>You said:</p>
                  <p className="text-sm" style={{ color: "var(--color-slate-700)" }}>{symptomText}</p>
                </div>
              )}
              <button
                onClick={() => setShowTextInput((s) => !s)}
                className="flex items-center gap-1.5 text-xs"
                style={{ color: "var(--color-slate-400)" }}
              >
                <Type size={12} />
                {showTextInput ? "Hide typing" : "Or type instead"}
              </button>
            </div>
          </div>

          {showTextInput && (
            <div className="glass-card p-4">
              <p className="text-xs font-medium mb-2" style={{ color: "var(--color-slate-400)" }}>{t(session.language, "symptoms_describe_label")}</p>
              <textarea
                value={symptomText}
                onChange={(e) => setSymptomText(e.target.value)}
                placeholder={t(session.language, "symptoms_placeholder")}
                rows={4}
                dir={rtl ? "rtl" : "ltr"}
                className="w-full px-3 py-2 rounded-xl text-sm resize-none focus:outline-none"
                style={{ background: "var(--color-cream-100)", border: "1px solid var(--color-cream-200)", color: "var(--color-slate-700)" }}
              />
            </div>
          )}

          <button onClick={() => handleAnalyze()} disabled={!symptomText.trim() || isAnalyzing} className="btn-primary w-full flex items-center justify-center gap-2">
            {isAnalyzing ? (<><div className="spinner" style={{ width: 16, height: 16, borderTopColor: "white", borderColor: "rgba(255,255,255,0.3)" }} /> {t(session.language, "symptoms_analyzing")}</>) : (<><Search size={16} /> {t(session.language, "symptoms_analyze")}</>)}
          </button>

          {error && <div className="alert-critical p-3"><p className="text-sm" style={{ color: "var(--color-danger-700)" }}>{error}</p></div>}
          {isAnalyzing && <LoadingDots text={t(session.language, "symptoms_mapping")} />}
          {patientExplanation && (
            <PatientConfirmation
              languageCode={session.language}
              extraText={patientExplanation.mapping}
            />
          )}
        </div>

        <aside className="patient-aside">
          <div className="glass-card p-4">
            <p className="text-xs font-medium mb-2" style={{ color: "var(--color-slate-400)" }}>{t(session.language, "symptoms_try_example")}</p>
            <div className="space-y-2">
              {examples.map((ex) => (
                <button key={ex.text} onClick={() => { setSymptomText(ex.text); updateLanguage(ex.lang); setPatientExplanation(null); }}
                  className="w-full text-left px-3 py-2 rounded-lg text-sm transition-colors cursor-pointer"
                  style={{ background: "var(--color-cream-100)", color: "var(--color-slate-600)" }}>
                  <span className="font-medium" style={{ color: "var(--color-coral-500)" }}>{ex.text}</span>
                  <span className="ml-2" style={{ color: "var(--color-slate-400)" }}>— {ex.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="warm-card p-4">
            <p className="text-xs font-medium mb-2" style={{ color: "var(--color-slate-400)" }}>Current patient context</p>
            <div className="space-y-3 text-sm">
              <div>
                <p className="text-xs" style={{ color: "var(--color-slate-400)" }}>Conditions</p>
                <p style={{ color: "var(--color-slate-700)" }}>{session.patientContext.conditions?.join(", ") || "None listed"}</p>
              </div>
              <div>
                <p className="text-xs" style={{ color: "var(--color-slate-400)" }}>Medications</p>
                <p style={{ color: "var(--color-slate-700)" }}>{session.patientContext.medications?.join(", ") || "None listed"}</p>
              </div>
            </div>
          </div>

          <div className="flex items-start gap-2 p-3 rounded-lg" style={{ background: "var(--color-teal-50)" }}>
            <Shield size={14} style={{ color: "var(--color-teal-500)", marginTop: 2, flexShrink: 0 }} />
            <p className="text-xs" style={{ color: "var(--color-teal-700)" }}>
              {t(session.language, "symptoms_privacy")}
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
