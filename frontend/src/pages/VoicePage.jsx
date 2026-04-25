import { useState, useRef } from "react";
import { Volume2, Play, Pause, Send, CheckCircle, Users, Sparkles } from "lucide-react";
import { LanguageSelector, LoadingDots, ListenButton } from "../components/shared/UIComponents";
import { useSession } from "../hooks/useSession";
import { api } from "../utils/api";
import { t, isRTL } from "../utils/translations";

function AudioPlayer({ audioBase64, duration }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const audioRef = useRef(null);
  const intervalRef = useRef(null);

  const togglePlay = () => {
    if (!audioBase64) return;
    if (!audioRef.current) {
      audioRef.current = new Audio(`data:audio/mpeg;base64,${audioBase64}`);
      audioRef.current.onended = () => { setIsPlaying(false); setProgress(0); clearInterval(intervalRef.current); };
    }
    if (isPlaying) { audioRef.current.pause(); clearInterval(intervalRef.current); }
    else {
      audioRef.current.play();
      intervalRef.current = setInterval(() => { if (audioRef.current) setProgress((audioRef.current.currentTime / audioRef.current.duration) * 100 || 0); }, 100);
    }
    setIsPlaying(!isPlaying);
  };

  const bars = Array.from({ length: 24 }, (_, i) => 6 + Math.sin(i * 0.8) * 10 + Math.random() * 6);

  return (
    <div className="flex items-center gap-3">
      <button onClick={togglePlay} className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 cursor-pointer" style={{ background: audioBase64 ? "var(--color-coral-50)" : "var(--color-cream-200)" }}>
        {isPlaying ? <Pause size={16} style={{ color: "var(--color-coral-500)" }} /> : <Play size={16} style={{ color: audioBase64 ? "var(--color-coral-500)" : "var(--color-slate-400)", marginLeft: 2 }} />}
      </button>
      <div className="flex-1"><div className="flex items-end gap-0.5 h-6">
        {bars.map((h, i) => <div key={i} className="rounded-full" style={{ width: 3, height: h, background: (i / bars.length) * 100 < progress ? "var(--color-coral-400)" : "var(--color-cream-300)" }} />)}
      </div></div>
      <span className="text-xs shrink-0" style={{ color: "var(--color-slate-400)" }}>0:{String(duration || 0).padStart(2, "0")}</span>
    </div>
  );
}

export default function VoicePage() {
  const { session, updateLanguage, addVoiceMessage } = useSession();
  const rtl = isRTL(session.language);
  const [careText, setCareText] = useState("");
  const [messageType, setMessageType] = useState("medication");
  const [isGenerating, setIsGenerating] = useState(false);
  const [messages, setMessages] = useState([]);
  const [error, setError] = useState(null);

  const types = [
    { value: "medication", label: t(session.language, "voice_type_med") },
    { value: "discharge", label: t(session.language, "voice_type_discharge") },
    { value: "followup", label: t(session.language, "voice_type_followup") },
    { value: "custom", label: t(session.language, "voice_type_custom") },
  ];

  // Build a patient-facing summary from the most recent session data
  const latestInsight = session.symptomInsights[session.symptomInsights.length - 1];
  const latestDiet = session.dietaryResults[session.dietaryResults.length - 1];
  const summaryParts = [];
  if (latestInsight) summaryParts.push(latestInsight.clinical_mapping);
  if (latestDiet?.hospital_meal_plan) summaryParts.push(latestDiet.hospital_meal_plan);
  const patientSummary = summaryParts.join(" ");

  const handleGenerate = async () => {
    if (!careText.trim()) return;
    setIsGenerating(true);
    setError(null);
    try {
      const data = await api.generateVoice(careText, session.language, null, messageType);
      const msg = {
        id: Date.now().toString(),
        typeLabel: types.find((t) => t.value === messageType)?.label || messageType,
        language: session.language,
        text: careText,
        simplified: data.simplified_text,
        audioBase64: data.audio_base64,
        duration: data.duration_seconds,
        method: data.method,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      setMessages((p) => [msg, ...p]);
      addVoiceMessage(msg);
      setCareText("");
    } catch (err) { setError(err.message); }
    finally { setIsGenerating(false); }
  };

  const examples = [
    "Take Metformin 500mg with food every morning before 9 AM. If you feel dizzy, call Dr. Chen's office.",
    "Your follow-up appointment is on Thursday at 2 PM with Dr. Patel in Building B, Room 204.",
  ];

  return (
    <div className="p-6 max-w-2xl mx-auto pb-24 lg:pb-6" dir={rtl ? "rtl" : "ltr"}>
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: "var(--color-coral-50)" }}>
          <Volume2 size={20} style={{ color: "var(--color-coral-500)" }} />
        </div>
        <div>
          <h1 className="text-xl font-semibold" style={{ color: "var(--color-slate-800)" }}>{t(session.language, "voice_title")}</h1>
          <p className="text-sm" style={{ color: "var(--color-slate-400)" }}>{t(session.language, "voice_subtitle")}</p>
        </div>
      </div>

      <div className="space-y-4">
        {/* Patient-facing summary listen section — visible when there's data */}
        {patientSummary && (
          <div className="glass-card p-5" style={{ borderLeft: "3px solid var(--color-coral-400)" }}>
            <div className="flex items-center gap-2 mb-2">
              <Sparkles size={14} style={{ color: "var(--color-coral-500)" }} />
              <p className="text-sm font-medium" style={{ color: "var(--color-slate-700)" }}>{t(session.language, "voice_listen_yours")}</p>
            </div>
            <p className="text-xs mb-3" style={{ color: "var(--color-slate-500)", lineHeight: 1.6 }}>
              {t(session.language, "voice_your_summary")}
            </p>
            <p className="text-sm p-3 rounded-lg mb-3" style={{ background: "var(--color-cream-100)", color: "var(--color-slate-600)", lineHeight: 1.6 }}>
              {patientSummary}
            </p>
            <ListenButton text={patientSummary} languageCode={session.language} />
          </div>
        )}

        <div className="glass-card p-4">
          <div className="flex items-center gap-2 mb-3">
            <Users size={14} style={{ color: "var(--color-slate-400)" }} />
            <p className="text-xs font-medium" style={{ color: "var(--color-slate-400)" }}>{t(session.language, "voice_care_circle")} ({session.careCircle.length})</p>
          </div>
          <div className="flex gap-4">
            {session.careCircle.map((m) => (
              <div key={m.id} className="flex flex-col items-center gap-1">
                <div className="w-10 h-10 rounded-full flex items-center justify-center text-xs font-medium" style={{ background: "var(--color-info-50)", color: "var(--color-info-700)" }}>{m.initials}</div>
                <span className="text-xs" style={{ color: "var(--color-slate-500)" }}>{m.name.split(" ")[0]}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="glass-card p-4">
          <p className="text-xs font-medium mb-2" style={{ color: "var(--color-slate-400)" }}>{t(session.language, "voice_language")}</p>
          <LanguageSelector selected={session.language} onSelect={updateLanguage} />
        </div>

        <div className="glass-card p-4">
          <p className="text-xs font-medium mb-2" style={{ color: "var(--color-slate-400)" }}>{t(session.language, "voice_message_type")}</p>
          <div className="flex flex-wrap gap-2 mb-3">
            {types.map((typeOpt) => (
              <button key={typeOpt.value} onClick={() => setMessageType(typeOpt.value)}
                className="lang-pill text-xs" style={messageType === typeOpt.value ? { background: "var(--color-teal-500)", color: "white", borderColor: "var(--color-teal-500)" } : {}}>
                {typeOpt.label}
              </button>
            ))}
          </div>
          <textarea value={careText} onChange={(e) => setCareText(e.target.value)}
            placeholder={t(session.language, "voice_placeholder")} rows={3}
            className="w-full px-3 py-2 rounded-xl text-sm resize-none focus:outline-none"
            style={{ background: "var(--color-cream-100)", border: "1px solid var(--color-cream-200)", color: "var(--color-slate-700)" }} />
          <div className="mt-2 space-y-1">
            {examples.map((ex, i) => (
              <button key={i} onClick={() => setCareText(ex)} className="w-full text-left text-xs px-2 py-1.5 rounded-lg cursor-pointer" style={{ color: "var(--color-slate-400)" }}>
                "{ex.substring(0, 70)}..."
              </button>
            ))}
          </div>
        </div>

        <button onClick={handleGenerate} disabled={!careText.trim() || isGenerating} className="btn-primary w-full flex items-center justify-center gap-2">
          {isGenerating ? (<><div className="spinner" style={{ width: 16, height: 16, borderTopColor: "white", borderColor: "rgba(255,255,255,0.3)" }} /> {t(session.language, "voice_generating")}</>) : (<><Send size={16} /> {t(session.language, "voice_generate")}</>)}
        </button>

        {error && <div className="alert-critical p-3"><p className="text-sm" style={{ color: "var(--color-danger-700)" }}>{error}</p></div>}
        {isGenerating && <LoadingDots text="Generating voice with ElevenLabs" />}

        {messages.map((msg) => (
          <div key={msg.id} className="glass-card p-4">
            <div className="flex items-start justify-between mb-2">
              <div>
                <p className="text-sm font-medium" style={{ color: "var(--color-slate-700)" }}>{msg.typeLabel}</p>
                <p className="text-xs" style={{ color: "var(--color-slate-400)" }}>{msg.timestamp}</p>
              </div>
              <span className="badge badge-success"><CheckCircle size={10} className="mr-1" /> {t(session.language, "voice_sent")}</span>
            </div>
            {msg.simplified?.translated && (
              <p className="text-sm p-2 rounded-lg mb-2" style={{ background: "var(--color-cream-100)", color: "var(--color-slate-600)" }}>
                {msg.simplified.translated}
              </p>
            )}
            <AudioPlayer audioBase64={msg.audioBase64} duration={msg.duration} />
          </div>
        ))}
      </div>
    </div>
  );
}
