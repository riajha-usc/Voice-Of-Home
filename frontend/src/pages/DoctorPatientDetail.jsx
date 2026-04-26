import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft, Phone, FileText, ClipboardList, Users as UsersIcon,
  AlertTriangle, Check, X, Edit3, Leaf, Volume2, Search, Shield,
  ChevronRight, Send, Play, Pause, Mic, RefreshCw, Globe,
  MessageCircle, Image,
} from "lucide-react";
import { useSession } from "../hooks/useSession";
import { getLanguageName } from "../components/shared/UIComponents";
import { api } from "../utils/api";

/* ------------------------------------------------------------------ */
/*  FeedbackButtons — Approve / Modify / Reject on every AI output    */
/* ------------------------------------------------------------------ */
function FeedbackButtons({ sessionId, doctorId, targetType, targetId }) {
  const [verdict, setVerdict] = useState(null);
  const [notes, setNotes] = useState("");
  const [submitted, setSubmitted] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [showNotes, setShowNotes] = useState(false);

  async function submit(v, n) {
    setSubmitting(true);
    try {
      await api.recordFeedback({
        session_id: sessionId,
        doctor_id: doctorId,
        target_type: targetType,
        target_id: targetId,
        verdict: v,
        notes: n || null,
      });
      setSubmitted(v);
      setShowNotes(false);
      setNotes("");
    } catch (err) {
      console.error("[Feedback]", err);
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    const c = {
      approved: { bg: "var(--color-teal-50)", fg: "var(--color-teal-700)" },
      modified: { bg: "var(--color-amber-50)", fg: "var(--color-amber-700)" },
      rejected: { bg: "var(--color-danger-50)", fg: "var(--color-danger-700)" },
    }[submitted];
    return (
      <div className="flex items-center gap-1 mt-2 px-2 py-1 rounded-full text-xs w-fit" style={{ background: c.bg, color: c.fg }}>
        <Check size={11} /> {submitted} by doctor
      </div>
    );
  }

  return (
    <div className="mt-2">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs" style={{ color: "var(--color-slate-400)" }}>Verdict:</span>
        <button onClick={() => submit("approved")} disabled={submitting}
          className="text-xs flex items-center gap-1 px-2 py-1 rounded-full"
          style={{ background: "var(--color-teal-50)", color: "var(--color-teal-700)" }}>
          <Check size={11} /> Approve
        </button>
        <button onClick={() => { setVerdict("modified"); setShowNotes(true); }}
          className="text-xs flex items-center gap-1 px-2 py-1 rounded-full"
          style={{ background: "var(--color-amber-50)", color: "var(--color-amber-700)" }}>
          <Edit3 size={11} /> Modify
        </button>
        <button onClick={() => { setVerdict("rejected"); setShowNotes(true); }}
          className="text-xs flex items-center gap-1 px-2 py-1 rounded-full"
          style={{ background: "var(--color-danger-50)", color: "var(--color-danger-700)" }}>
          <X size={11} /> Reject
        </button>
      </div>
      {showNotes && verdict && (
        <div className="mt-2 flex gap-2">
          <input value={notes} onChange={(e) => setNotes(e.target.value)}
            placeholder={verdict === "modified" ? "What needs to change?" : "Why reject?"}
            className="flex-1 px-2 py-1 rounded text-xs focus:outline-none"
            style={{ background: "var(--color-cream-100)", border: "1px solid var(--color-cream-200)" }} />
          <button onClick={() => submit(verdict, notes)} disabled={submitting}
            className="text-xs px-3 rounded" style={{ background: "var(--color-slate-700)", color: "white" }}>
            Save
          </button>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Voice Message Modal                                                */
/* ------------------------------------------------------------------ */
function VoiceMessageModal({ isOpen, onClose, member, sessionId }) {
  const [language, setLanguage] = useState(member?.language_code || "vi");
  const [message, setMessage] = useState("");
  const [audioData, setAudioData] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [sent, setSent] = useState(false);
  const audioRef = useRef(null);

  const LANGUAGES = [
    { code: "vi", name: "Vietnamese" },
    { code: "es", name: "Spanish" },
    { code: "hi", name: "Hindi" },
    { code: "zh", name: "Mandarin" },
    { code: "ar", name: "Arabic" },
    { code: "ko", name: "Korean" },
    { code: "tl", name: "Tagalog" },
    { code: "ht", name: "Haitian Creole" },
    { code: "fa", name: "Farsi" },
    { code: "en", name: "English" },
  ];

  const handlePreview = async () => {
    if (!message.trim()) return;
    setIsGenerating(true);
    try {
      const data = await api.generateVoice(message, language, sessionId, "custom");
      if (data.audio_base64) {
        setAudioData(data);
      }
    } catch (err) {
      console.error("[VoiceModal] preview failed:", err);
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePlay = () => {
    if (!audioData?.audio_base64) return;
    if (isPlaying && audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setIsPlaying(false);
      return;
    }
    audioRef.current = new Audio(`data:audio/mpeg;base64,${audioData.audio_base64}`);
    audioRef.current.onended = () => setIsPlaying(false);
    audioRef.current.play();
    setIsPlaying(true);
  };

  const handleSend = async () => {
    setIsSending(true);
    // In production this would send to the family member's device
    await new Promise((r) => setTimeout(r, 800));
    setSent(true);
    setIsSending(false);
    setTimeout(() => {
      onClose();
      setSent(false);
      setMessage("");
      setAudioData(null);
    }, 1500);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.4)" }}>
      <div
        className="w-full max-w-lg mx-4 rounded-2xl overflow-hidden"
        style={{ background: "white", boxShadow: "var(--shadow-modal)" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5" style={{ borderBottom: "1px solid var(--color-cream-200)" }}>
          <h3 className="font-semibold" style={{ color: "var(--color-slate-800)" }}>
            Send voice message to {member?.name || "Family Member"}
          </h3>
          <button onClick={onClose} className="p-1 rounded-lg" style={{ color: "var(--color-slate-400)" }}>
            <X size={18} />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* Step 1: Choose language */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold text-white"
                style={{ background: "var(--color-teal-500)" }}>1</span>
              <span className="text-sm font-medium" style={{ color: "var(--color-slate-700)" }}>Choose language</span>
            </div>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl text-sm focus:outline-none"
              style={{ background: "var(--color-cream-50)", border: "1px solid var(--color-cream-200)", color: "var(--color-slate-700)" }}
            >
              {LANGUAGES.map((l) => (
                <option key={l.code} value={l.code}>{l.name}</option>
              ))}
            </select>
          </div>

          {/* Step 2: Message */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold text-white"
                style={{ background: "var(--color-teal-500)" }}>2</span>
              <span className="text-sm font-medium" style={{ color: "var(--color-slate-700)" }}>
                Message (we'll convert to natural voice)
              </span>
            </div>
            <div className="relative">
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value.slice(0, 300))}
                placeholder="Type the care instruction message here..."
                rows={3}
                className="w-full px-3 py-2.5 rounded-xl text-sm focus:outline-none resize-none"
                style={{ background: "var(--color-cream-50)", border: "1px solid var(--color-cream-200)", color: "var(--color-slate-700)" }}
              />
              <span className="absolute bottom-2 right-3 text-xs" style={{ color: "var(--color-slate-400)" }}>
                {message.length}/300
              </span>
            </div>

            {/* Voice notice callout */}
            <div className="flex items-start gap-3 mt-3 p-3 rounded-xl" style={{ background: "var(--color-coral-50)", border: "1px solid var(--color-coral-100)" }}>
              <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ background: "var(--color-coral-400)" }}>
                <Mic size={14} style={{ color: "white" }} />
              </div>
              <div>
                <p className="text-sm font-medium" style={{ color: "var(--color-coral-500)" }}>
                  This will be sent as a voice message
                </p>
                <p className="text-xs mt-0.5" style={{ color: "var(--color-slate-500)" }}>
                  {member?.name || "The recipient"} will receive this as a natural-sounding voice message in {LANGUAGES.find((l) => l.code === language)?.name || language}.
                </p>
              </div>
            </div>
          </div>

          {/* Step 3: Preview */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold text-white"
                style={{ background: audioData ? "var(--color-teal-500)" : "var(--color-slate-300)" }}>3</span>
              <span className="text-sm font-medium" style={{ color: "var(--color-slate-700)" }}>Preview voice message</span>
            </div>

            {!audioData ? (
              <button
                onClick={handlePreview}
                disabled={!message.trim() || isGenerating}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium"
                style={{
                  background: message.trim() ? "var(--color-teal-50)" : "var(--color-cream-100)",
                  color: message.trim() ? "var(--color-teal-600)" : "var(--color-slate-400)",
                  border: `1px solid ${message.trim() ? "var(--color-teal-200)" : "var(--color-cream-200)"}`,
                }}
              >
                {isGenerating ? (
                  <><div className="spinner" style={{ width: 14, height: 14, borderTopColor: "var(--color-teal-500)" }} /> Generating preview...</>
                ) : (
                  <><Volume2 size={14} /> Generate Preview</>
                )}
              </button>
            ) : (
              <div className="flex items-center gap-3 p-3 rounded-xl" style={{ background: "var(--color-cream-50)", border: "1px solid var(--color-cream-200)" }}>
                <button
                  onClick={handlePlay}
                  className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ background: "var(--color-teal-500)", color: "white" }}
                >
                  {isPlaying ? <Pause size={16} /> : <Play size={16} style={{ marginLeft: 2 }} />}
                </button>
                {/* Waveform visualization */}
                <div className="flex-1 flex items-center gap-0.5 h-8">
                  {Array.from({ length: 30 }, (_, i) => (
                    <div
                      key={i}
                      className="flex-1 rounded-full"
                      style={{
                        height: `${20 + Math.random() * 80}%`,
                        background: i < 15 ? "var(--color-teal-400)" : "var(--color-slate-200)",
                      }}
                    />
                  ))}
                </div>
                <span className="text-xs flex-shrink-0" style={{ color: "var(--color-slate-400)" }}>
                  0:{String(Math.round(audioData.duration_seconds || 12)).padStart(2, "0")}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-5 pt-0">
          <button
            onClick={handleSend}
            disabled={!audioData || isSending || sent}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold transition-colors"
            style={{
              background: sent ? "var(--color-teal-500)" : audioData ? "var(--color-coral-400)" : "var(--color-slate-200)",
              color: "white",
              cursor: audioData && !sent ? "pointer" : "not-allowed",
            }}
          >
            {sent ? (
              <><Check size={16} /> Sent!</>
            ) : isSending ? (
              <><div className="spinner" style={{ width: 14, height: 14, borderTopColor: "white", borderColor: "rgba(255,255,255,0.3)" }} /> Sending...</>
            ) : (
              <><Send size={14} /> Send Voice Message</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  EmptyState helper                                                  */
/* ------------------------------------------------------------------ */
function EmptyState({ icon: Icon, text, action, actionLabel }) {
  return (
    <div className="text-center py-6">
      <Icon size={24} style={{ color: "var(--color-slate-300)", margin: "0 auto 8px" }} />
      <p className="text-sm" style={{ color: "var(--color-slate-400)" }}>{text}</p>
      {action && (
        <button onClick={action}
          className="mt-3 text-xs font-medium px-4 py-2 rounded-xl"
          style={{ background: "var(--color-coral-50)", color: "var(--color-coral-500)", border: "1px solid var(--color-coral-200)" }}>
          {actionLabel}
        </button>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Patient Detail                                                */
/* ------------------------------------------------------------------ */
export default function DoctorPatientDetail() {
  const { session } = useSession();
  const navigate = useNavigate();

  const [researchQuery, setResearchQuery] = useState("");
  const [isResearching, setIsResearching] = useState(false);
  const [researchResult, setResearchResult] = useState(null);
  const [feedbackStats, setFeedbackStats] = useState(null);
  const [voiceModalOpen, setVoiceModalOpen] = useState(false);
  const [voiceModalMember, setVoiceModalMember] = useState(null);

  useEffect(() => {
    api.feedbackStats().then(setFeedbackStats).catch(() => {});
  }, []);

  const handleResearch = async () => {
    if (!researchQuery.trim()) return;
    setIsResearching(true);
    setResearchResult(null);
    try {
      const data = await api.searchKnowledge(researchQuery, session.language);
      if (data.results && data.results.length > 0) {
        setResearchResult({ found: true, insights: data.results, method: data.method });
      } else {
        setResearchResult({ found: false, query: researchQuery });
      }
    } catch {
      setResearchResult({ found: false, query: researchQuery });
    } finally {
      setIsResearching(false);
    }
  };

  const openVoiceModal = (member) => {
    setVoiceModalMember(member);
    setVoiceModalOpen(true);
  };

  const hasInsights = session.symptomInsights.length > 0;
  const hasDiet = session.dietaryResults.length > 0;
  const hasVoice = session.voiceMessages.length > 0;
  const latestDiet = hasDiet ? session.dietaryResults[session.dietaryResults.length - 1] : null;

  const yob = session.patient?.year_of_birth || (session.patient?.dob ? parseInt(session.patient.dob.slice(0, 4)) : null);
  const age = yob ? new Date().getFullYear() - yob : null;

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Top bar */}
      <div className="flex items-center justify-between mb-5">
        <button
          onClick={() => navigate("/doctor")}
          className="flex items-center gap-2 text-sm font-medium"
          style={{ color: "var(--color-slate-500)" }}
        >
          <ArrowLeft size={16} /> Back to patients
        </button>
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium"
            style={{
              background: "var(--color-coral-400)",
              color: "white",
              boxShadow: "0 2px 8px rgba(0,0,0,0.12)",
            }}
          >
            <UsersIcon size={12} /> Family view
          </button>
        </div>
      </div>

      {/* Patient overview header */}
      <div className="warm-card p-5 mb-4">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-xl font-semibold" style={{ color: "var(--color-slate-800)" }}>
              Patient overview
            </h1>
            <p className="text-xs mt-1" style={{ color: "var(--color-slate-400)" }}>
              Session #{session.sessionId.slice(-6)} · Last updated {new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button className="btn-outline text-xs px-3 py-1.5 flex items-center gap-1.5 rounded-lg">
              <Phone size={12} /> Call Family
            </button>
            <button className="btn-outline text-xs px-3 py-1.5 flex items-center gap-1.5 rounded-lg">
              <FileText size={12} /> Export Summary
            </button>
            <button className="btn-outline text-xs px-3 py-1.5 flex items-center gap-1.5 rounded-lg">
              <ClipboardList size={12} /> Discharge Notes
            </button>
          </div>
        </div>

        {/* Quick stat pills */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-4">
          <div className="p-3 rounded-xl" style={{ background: "var(--color-cream-50)" }}>
            <p className="text-xs" style={{ color: "var(--color-slate-400)" }}>Language</p>
            <p className="text-sm font-semibold mt-0.5" style={{ color: "var(--color-slate-700)" }}>
              {getLanguageName(session.language)}
            </p>
          </div>
          <div className="p-3 rounded-xl" style={{ background: "var(--color-cream-50)" }}>
            <p className="text-xs" style={{ color: "var(--color-slate-400)" }}>Cultural alerts</p>
            <p className="text-sm font-semibold mt-0.5" style={{ color: hasInsights ? "var(--color-amber-600)" : "var(--color-slate-300)" }}>
              {session.symptomInsights.length} {hasInsights && <span style={{ color: "var(--color-danger-500)" }}>●</span>}
            </p>
          </div>
          <div className="p-3 rounded-xl" style={{ background: "var(--color-cream-50)" }}>
            <p className="text-xs" style={{ color: "var(--color-slate-400)" }}>Diet plan</p>
            <p className="text-sm font-semibold mt-0.5" style={{ color: hasDiet ? "var(--color-teal-600)" : "var(--color-coral-500)" }}>
              {hasDiet ? "Adapted" : "Pending"}
            </p>
          </div>
          <div className="p-3 rounded-xl" style={{ background: "var(--color-cream-50)" }}>
            <p className="text-xs" style={{ color: "var(--color-slate-400)" }}>Voice messages</p>
            <p className="text-sm font-semibold mt-0.5" style={{ color: "var(--color-slate-700)" }}>
              {session.voiceMessages.length} sent {hasVoice && <span style={{ color: "var(--color-teal-500)" }}>●</span>}
            </p>
          </div>
        </div>
      </div>

      {/* Two-column content: Symptom insights + Dietary adaptation */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        {/* Cultural symptom insights */}
        <div className="warm-card p-5" style={{ borderLeft: "3px solid var(--color-amber-400)", borderRadius: "0 var(--radius-lg) var(--radius-lg) 0" }}>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-medium" style={{ color: "var(--color-slate-700)" }}>Cultural symptom insights</h2>
            {hasInsights && (
              <span className="flex items-center gap-1 text-xs px-2 py-1 rounded-full"
                style={{ background: "var(--color-amber-50)", color: "var(--color-amber-600)" }}>
                <AlertTriangle size={11} /> Review recommended
              </span>
            )}
          </div>

          {!hasInsights ? (
            <EmptyState icon={AlertTriangle} text="No symptoms reported yet. Waiting for patient input." />
          ) : (
            <div className="space-y-3">
              {session.symptomInsights.map((insight) => (
                <div key={insight.id || insight.timestamp} className="p-3 rounded-xl" style={{ background: "var(--color-cream-50)" }}>
                  {(insight.insights || []).map((ins, j) => (
                    <div key={j} className="space-y-2 text-sm">
                      <div className="p-2 rounded-lg" style={{ background: "var(--color-amber-50)", border: "1px solid var(--color-amber-100)" }}>
                        <p className="text-sm font-medium" style={{ color: "var(--color-slate-700)" }}>
                          "{ins.cultural_expression}"
                        </p>
                        {ins.literal_translation && (
                          <p className="text-xs mt-1" style={{ color: "var(--color-slate-500)" }}>
                            Interpreted as: {ins.literal_translation}
                          </p>
                        )}
                        {ins.clinical_mapping && (
                          <p className="text-xs mt-1" style={{ color: "var(--color-slate-500)" }}>
                            Cultural context: {ins.clinical_mapping}
                          </p>
                        )}
                      </div>

                      {ins.icd10_codes?.length > 0 && (
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-xs" style={{ color: "var(--color-slate-400)" }}>ICD-10:</span>
                          {ins.icd10_codes.map((c) => <span key={c} className="badge badge-info text-xs">{c}</span>)}
                        </div>
                      )}
                      {ins.recommended_screenings?.length > 0 && (
                        <p className="text-xs"><span style={{ color: "var(--color-slate-400)" }}>Screenings: </span>
                          <span style={{ color: "var(--color-amber-600)" }}>{ins.recommended_screenings.join(", ")}</span></p>
                      )}
                      <div className="flex items-center gap-2">
                        <span className={`badge text-xs ${ins.confidence === "high" ? "badge-success" : ins.confidence === "medium" ? "badge-warning" : "badge-danger"}`}>
                          {ins.confidence} confidence
                        </span>
                        {ins.source && <span className="text-xs italic" style={{ color: "var(--color-slate-400)" }}>{ins.source}</span>}
                      </div>
                    </div>
                  ))}
                  <FeedbackButtons sessionId={session.sessionId} doctorId={session.doctor?.id}
                    targetType="symptom_insight" targetId={insight.id || insight.timestamp} />
                </div>
              ))}
            </div>
          )}

          {hasInsights && (
            <button className="mt-3 text-xs font-medium flex items-center gap-1" style={{ color: "var(--color-coral-500)" }}>
              View full insight <ChevronRight size={12} />
            </button>
          )}
        </div>

        {/* Dietary adaptation */}
        <div className="warm-card p-5" style={{ borderLeft: "3px solid var(--color-teal-400)", borderRadius: "0 var(--radius-lg) var(--radius-lg) 0" }}>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-medium" style={{ color: "var(--color-slate-700)" }}>Dietary adaptation</h2>
            {hasDiet ? (
              <span className="flex items-center gap-1 text-xs px-2 py-1 rounded-full"
                style={{ background: "var(--color-teal-50)", color: "var(--color-teal-600)" }}>
                <RefreshCw size={11} /> Adapted
              </span>
            ) : (
              <span className="flex items-center gap-1 text-xs px-2 py-1 rounded-full"
                style={{ background: "var(--color-cream-100)", color: "var(--color-slate-500)" }}>
                Waiting for food photo
              </span>
            )}
          </div>

          {!hasDiet ? (
            <div className="text-center py-6">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-3"
                style={{ background: "var(--color-cream-100)" }}>
                <Image size={24} style={{ color: "var(--color-slate-300)" }} />
              </div>
              <p className="text-sm font-medium" style={{ color: "var(--color-slate-600)" }}>Waiting for food photo</p>
              <p className="text-xs mt-1" style={{ color: "var(--color-slate-400)" }}>
                No food data yet. Waiting for family to upload a photo of meals.
              </p>
              <button className="mt-4 text-sm font-medium px-4 py-2 rounded-xl"
                style={{ background: "var(--color-coral-50)", color: "var(--color-coral-500)", border: "1px solid var(--color-coral-200)" }}>
                Request Food Photo
              </button>
            </div>
          ) : (
            <div className="space-y-2 text-sm">
              <div><span style={{ color: "var(--color-slate-400)" }}>Dish: </span>
                <span className="font-medium">{latestDiet.dish_name} ({latestDiet.dish_name_english})</span></div>
              <div><span style={{ color: "var(--color-slate-400)" }}>Cuisine: </span><span>{latestDiet.cuisine}</span></div>
              {latestDiet.nutrition_original && (
                <>
                  <div><span style={{ color: "var(--color-slate-400)" }}>Sodium (original): </span>
                    <span style={{ color: "var(--color-danger-500)" }}>{latestDiet.nutrition_original.sodium_mg}mg</span></div>
                  <div><span style={{ color: "var(--color-slate-400)" }}>Sodium (adapted): </span>
                    <span style={{ color: "var(--color-teal-600)" }}>{latestDiet.nutrition_adapted.sodium_mg}mg</span></div>
                </>
              )}
              {latestDiet.adaptation_notes && (
                <div><span style={{ color: "var(--color-slate-400)" }}>Changes: </span><span>{latestDiet.adaptation_notes}</span></div>
              )}
              {latestDiet.hospital_meal_plan && (
                <div className="p-2 rounded-lg mt-2" style={{ background: "var(--color-teal-50)" }}>
                  <p className="text-xs font-medium" style={{ color: "var(--color-teal-700)" }}>Hospital meal plan:</p>
                  <p className="text-xs mt-1" style={{ color: "var(--color-teal-600)" }}>{latestDiet.hospital_meal_plan}</p>
                </div>
              )}
              <FeedbackButtons sessionId={session.sessionId} doctorId={session.doctor?.id}
                targetType="dietary" targetId={latestDiet.id || latestDiet.timestamp} />
            </div>
          )}
        </div>
      </div>

      {/* Two-column: Family communication + Cultural expression lookup */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        {/* Family communication status */}
        <div className="warm-card p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <UsersIcon size={16} style={{ color: "var(--color-slate-400)" }} />
              <h2 className="font-medium" style={{ color: "var(--color-slate-700)" }}>Family communication status</h2>
            </div>
          </div>

          {session.careCircle.length === 0 ? (
            <p className="text-sm" style={{ color: "var(--color-slate-400)" }}>
              No family members joined yet. Patient join code: <span className="font-mono font-semibold">{session.joinCode || "—"}</span>
            </p>
          ) : (
            <div className="space-y-1">
              {session.careCircle.map((m) => (
                <div key={m.id} className="flex items-center gap-3 py-2.5 px-2 rounded-xl"
                  style={{ borderBottom: "1px solid var(--color-cream-100)" }}>
                  <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-semibold"
                    style={{ background: "var(--color-teal-50)", color: "var(--color-teal-700)" }}>
                    {m.initials || (m.name || "?")[0].toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium" style={{ color: "var(--color-slate-700)" }}>{m.name}</p>
                    <p className="text-xs" style={{ color: "var(--color-slate-400)" }}>
                      {m.relationship}{m.language_code ? ` · ${getLanguageName(m.language_code)}` : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {m.messagesTotal > 0 ? (
                      <span className={`text-xs ${m.messagesHeard === m.messagesTotal ? "" : ""}`}
                        style={{ color: m.messagesHeard === m.messagesTotal ? "var(--color-teal-600)" : "var(--color-amber-600)" }}>
                        {m.messagesHeard} unread message {m.messagesHeard !== 1 ? "" : ""} ●
                      </span>
                    ) : (
                      <span className="text-xs" style={{ color: "var(--color-slate-400)" }}>No messages yet</span>
                    )}
                    <button
                      onClick={() => openVoiceModal(m)}
                      className="text-xs px-2 py-1 rounded-lg font-medium"
                      style={{ background: "var(--color-cream-100)", color: "var(--color-slate-600)" }}
                    >
                      Reply
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <button
            className="mt-3 text-xs font-medium flex items-center gap-1"
            style={{ color: "var(--color-teal-600)" }}
          >
            View all family members <ChevronRight size={12} />
          </button>

          {hasVoice && (
            <div className="mt-3 pt-3 space-y-2" style={{ borderTop: "1px solid var(--color-cream-200)" }}>
              <p className="text-xs font-medium" style={{ color: "var(--color-slate-400)" }}>Recent voice messages:</p>
              {session.voiceMessages.slice(-3).reverse().map((msg) => (
                <div key={msg.id || msg.timestamp} className="text-xs p-2.5 rounded-xl" style={{ background: "var(--color-cream-50)" }}>
                  <div className="flex items-center gap-2">
                    <Volume2 size={12} style={{ color: "var(--color-coral-400)" }} />
                    <span style={{ color: "var(--color-slate-600)" }}>{msg.typeLabel || msg.message_type}</span>
                    <span style={{ color: "var(--color-slate-400)" }}>· {new Date(msg.timestamp).toLocaleTimeString()}</span>
                  </div>
                  <FeedbackButtons sessionId={session.sessionId} doctorId={session.doctor?.id}
                    targetType="voice_message" targetId={msg.id || msg.timestamp} />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Look up cultural expression */}
        <div className="warm-card p-5">
          <div className="flex items-center gap-2 mb-2">
            <Search size={16} style={{ color: "var(--color-slate-400)" }} />
            <h2 className="font-medium" style={{ color: "var(--color-slate-700)" }}>Look up cultural expression</h2>
          </div>
          <p className="text-xs mb-3" style={{ color: "var(--color-slate-400)" }}>
            Search any cultural symptom expression to understand its clinical significance. If not found in our validated database, the system will research it using AI.
          </p>

          <div className="flex gap-2 mb-3">
            <input value={researchQuery} onChange={(e) => setResearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleResearch()}
              placeholder='e.g., "susto" or "trung gió"'
              className="flex-1 px-3 py-2.5 rounded-xl text-sm focus:outline-none"
              style={{ background: "var(--color-cream-50)", border: "1px solid var(--color-cream-200)" }} />
            <button onClick={handleResearch} disabled={!researchQuery.trim() || isResearching}
              className="text-sm px-5 py-2.5 rounded-xl flex items-center gap-1.5 font-medium"
              style={{ background: "var(--color-coral-400)", color: "white" }}>
              {isResearching ? <div className="spinner" style={{ width: 14, height: 14, borderTopColor: "white", borderColor: "rgba(255,255,255,0.3)" }} /> : <Search size={14} />}
              Search
            </button>
          </div>

          {/* Recent searches */}
          {!researchResult && (
            <div className="mb-3">
              <p className="text-xs mb-2" style={{ color: "var(--color-slate-400)" }}>Recent searches</p>
              <div className="flex gap-2 flex-wrap">
                {["susto", "trung gió", "mal de ojo"].map((term) => (
                  <button key={term}
                    onClick={() => { setResearchQuery(term); }}
                    className="text-xs px-3 py-1.5 rounded-full"
                    style={{ background: "var(--color-cream-100)", color: "var(--color-slate-600)", border: "1px solid var(--color-cream-200)" }}>
                    "{term}"
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Search results — wireframe case 3 layout */}
          {researchResult?.found && (
            <div className="mt-3">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                {/* Top match */}
                {researchResult.insights.length > 0 && (
                  <div className="p-4 rounded-xl" style={{ background: "var(--color-cream-50)", border: "1px solid var(--color-cream-200)" }}>
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs font-medium" style={{ color: "var(--color-slate-400)" }}>Top match</p>
                      <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                        style={{ background: "var(--color-teal-50)", color: "var(--color-teal-600)" }}>
                        High relevance
                      </span>
                    </div>
                    <p className="font-semibold" style={{ color: "var(--color-slate-800)" }}>
                      {researchResult.insights[0].cultural_expression}
                      {researchResult.insights[0].region && (
                        <span className="text-xs font-normal ml-1" style={{ color: "var(--color-slate-400)" }}>
                          ({researchResult.insights[0].region || researchResult.insights[0].language_code})
                        </span>
                      )}
                    </p>
                    <p className="text-sm mt-2" style={{ color: "var(--color-slate-600)" }}>
                      {researchResult.insights[0].clinical_mapping}
                    </p>

                    {/* Common symptoms */}
                    {researchResult.insights[0].recommended_screenings?.length > 0 && (
                      <div className="mt-3">
                        <p className="text-xs mb-1.5" style={{ color: "var(--color-slate-400)" }}>Common symptoms:</p>
                        <div className="flex flex-wrap gap-1.5">
                          {researchResult.insights[0].recommended_screenings.map((s) => (
                            <span key={s} className="text-xs px-2.5 py-1 rounded-full"
                              style={{ background: "var(--color-cream-200)", color: "var(--color-slate-600)" }}>
                              {s}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    <button className="mt-3 text-xs font-medium flex items-center gap-1" style={{ color: "var(--color-coral-500)" }}>
                      View full insight <ChevronRight size={12} />
                    </button>
                    <FeedbackButtons sessionId={session.sessionId} doctorId={session.doctor?.id}
                      targetType="knowledge_search" targetId={researchResult.insights[0].id || `${researchResult.insights[0].cultural_expression}-0`} />
                  </div>
                )}

                {/* Other matches */}
                {researchResult.insights.length > 1 && (
                  <div>
                    <p className="text-xs font-medium mb-2" style={{ color: "var(--color-slate-400)" }}>Other matches</p>
                    <div className="space-y-2">
                      {researchResult.insights.slice(1).map((ins, i) => (
                        <div key={i} className="p-3 rounded-xl" style={{ background: "var(--color-cream-50)", border: "1px solid var(--color-cream-100)" }}>
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold"
                              style={{
                                background: ins.confidence === "high" ? "var(--color-teal-50)" : "var(--color-amber-50)",
                                color: ins.confidence === "high" ? "var(--color-teal-700)" : "var(--color-amber-600)",
                              }}>
                              {(ins.language_code || "?")[0].toUpperCase()}
                            </div>
                            <div>
                              <p className="text-sm font-medium" style={{ color: "var(--color-slate-700)" }}>
                                {ins.cultural_expression}
                                {ins.region && <span className="text-xs font-normal ml-1" style={{ color: "var(--color-slate-400)" }}>({ins.region})</span>}
                              </p>
                              <p className="text-xs" style={{ color: "var(--color-slate-500)" }}>
                                {ins.clinical_mapping?.slice(0, 80)}{ins.clinical_mapping?.length > 80 ? "…" : ""}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {researchResult && !researchResult.found && (
            <div className="mt-3 p-3 rounded-xl" style={{ background: "var(--color-amber-50)" }}>
              <p className="text-xs" style={{ color: "var(--color-amber-600)" }}>
                No matches for "{researchResult.query}". Consider consulting a cultural liaison or interpreter.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Privacy / compliance footer */}
      <div className="flex items-start gap-2 p-4 rounded-xl" style={{ background: "var(--color-teal-50)" }}>
        <Shield size={14} style={{ color: "var(--color-teal-500)", marginTop: 2 }} />
        <p className="text-xs" style={{ color: "var(--color-teal-700)" }}>
          All data displayed uses session tokens, not patient identifiers. Audio was processed on-device. No PII was sent to any AI model.
        </p>
      </div>

      {/* Voice message modal */}
      <VoiceMessageModal
        isOpen={voiceModalOpen}
        onClose={() => setVoiceModalOpen(false)}
        member={voiceModalMember}
        sessionId={session.sessionId}
      />
    </div>
  );
}
