import { useEffect, useRef, useState } from "react";
import {
  Heart, Send, AlertCircle, Sparkles, Database, Mic, MicOff,
  BookOpen, Image, FileText, ChevronRight, Lock, Phone, Globe,
  Wind, Music, Footprints, Droplets, Calendar,
  BookHeart, Briefcase, Users, DollarSign, GraduationCap, HeartHandshake,
  MoreHorizontal, Activity,
} from "lucide-react";
import { useSession } from "../hooks/useSession";
import { getLanguageName, ListenButton } from "../components/shared/UIComponents";
import { api } from "../utils/api";

const CRISIS_TRIGGERS = /(suicid|kill myself|kill mself|end my life|end it all|hurt myself|self.?harm|i want to die|don't want to live)/i;

/* ------------------------------------------------------------------ */
/*  Slider helper with gradient color                                  */
/* ------------------------------------------------------------------ */
function GradientSlider({ label, value, onChange, colors }) {
  const gradient = `linear-gradient(to right, ${colors.join(", ")})`;
  const pct = value;
  const dotColor = colors[Math.min(Math.floor((value / 100) * colors.length), colors.length - 1)];

  return (
    <div className="flex items-center gap-3 py-2">
      <span className="text-sm w-44 flex-shrink-0" style={{ color: "var(--color-slate-600)" }}>{label}</span>
      <div className="flex-1 relative h-3">
        {/* Track background */}
        <div className="absolute inset-0 rounded-full" style={{ background: "var(--color-cream-200)" }} />
        {/* Filled track */}
        <div className="absolute left-0 top-0 h-full rounded-full" style={{ width: `${pct}%`, background: gradient }} />
        {/* Thumb */}
        <input
          type="range" min="0" max="100" value={value}
          onChange={(e) => onChange(parseInt(e.target.value))}
          className="absolute inset-0 w-full opacity-0 cursor-pointer"
          style={{ height: "100%" }}
        />
        <div
          className="absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full border-2 border-white"
          style={{ left: `calc(${pct}% - 8px)`, background: dotColor, boxShadow: "0 1px 4px rgba(0,0,0,0.2)", pointerEvents: "none" }}
        />
      </div>
      <span className="text-sm font-semibold w-10 text-right" style={{ color: dotColor }}>{pct}%</span>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Trigger category pill                                              */
/* ------------------------------------------------------------------ */
const TRIGGER_CATEGORIES = [
  { key: "study", label: "Study / School", icon: GraduationCap },
  { key: "relationship", label: "Relationship", icon: HeartHandshake },
  { key: "family", label: "Family", icon: Users },
  { key: "health", label: "Health", icon: Activity },
  { key: "work", label: "Work", icon: Briefcase },
  { key: "finances", label: "Finances", icon: DollarSign },
  { key: "other", label: "Other", icon: MoreHorizontal },
];

/* ------------------------------------------------------------------ */
/*  Therapeutic recommendations                                        */
/* ------------------------------------------------------------------ */
const RECOMMENDATIONS = [
  { icon: Wind, label: "Box Breathing Exercise", desc: "4-4-4-4 technique to calm anxiety", color: "var(--color-info-500)" },
  { icon: Users, label: "5-4-3-2-1 Grounding", desc: "Use your senses to stay present", color: "var(--color-coral-400)" },
  { icon: Music, label: "Listen to Calm Music", desc: "Try binaural beats or nature sounds", color: "var(--color-teal-600)" },
  { icon: Footprints, label: "Take a Short Walk", desc: "Even 5 minutes outside can help", color: "var(--color-coral-500)" },
  { icon: Droplets, label: "Drink Water", desc: "Stay hydrated to support your mood", color: "var(--color-info-700)" },
];

/* ------------------------------------------------------------------ */
/*  Main component                                                     */
/* ------------------------------------------------------------------ */
export default function MentalHealthPage() {
  const { session, onAnalyzed } = useSession();
  const patientName = session.patient?.first_name || "there";

  /* ---- Section 1: Let's Talk (voice + text) ---- */
  const [messages, setMessages] = useState([
    { role: "assistant", content: "Hi. I'm here to listen. Take your time — what's on your mind?" },
  ]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [showCrisis, setShowCrisis] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const scrollRef = useRef(null);

  /* ---- Section 2: Journal ---- */
  const [journalTab, setJournalTab] = useState("write"); // write | image | file
  const [journalText, setJournalText] = useState("");

  /* ---- Section 3: Triggers ---- */
  const [intensity, setIntensity] = useState(5);
  const [selectedTriggers, setSelectedTriggers] = useState([]);
  const [triggerNotes, setTriggerNotes] = useState("");

  /* ---- Section 5: Feelings ---- */
  const [feelings, setFeelings] = useState({
    anxiety: 30, stress: 40, energy: 60, focus: 45,
    hopelessness: 25, anger: 30, confidence: 55, overwhelmed: 45,
  });

  /* ---- Section 6: Recommendation feedback ---- */
  const [recFeedback, setRecFeedback] = useState(null); // "helpful" | "need_more"
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  /* ---- Pattern matches ---- */
  const [matches, setMatches] = useState([]);
  const [stats, setStats] = useState(null);

  useEffect(() => {
    api.getMentalHealthStats().then(setStats).catch(() => {});
  }, []);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, busy]);

  /* ---- Chat send ---- */
  async function sendChat() {
    const text = input.trim();
    if (!text || busy) return;
    if (CRISIS_TRIGGERS.test(text)) setShowCrisis(true);

    setMessages((m) => [...m, { role: "user", content: text }]);
    setInput("");
    setBusy(true);

    api.matchMentalHealthPattern(text, 2).then((res) => setMatches(res.matches || [])).catch(() => {});

    try {
      const result = await api.chat(
        text, session.sessionId, session.language,
        session.patientContext,
        messages.map((m) => ({ role: m.role, content: m.content })),
        "mental_health"
      );
      const reply = result.response || result.reply || "I'm here. Tell me a little more?";
      setMessages((m) => [...m, { role: "assistant", content: reply, method: result.method }]);
    } catch {
      setMessages((m) => [...m, { role: "assistant", content: "I lost connection for a moment. I'm still here when you're ready.", method: "error" }]);
    } finally {
      setBusy(false);
    }
  }

  /* ---- Speech recognition ---- */
  function toggleRecording() {
    if (!("webkitSpeechRecognition" in window || "SpeechRecognition" in window)) return;
    if (isRecording) { setIsRecording(false); return; }
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = session.language || "en";
    recognition.continuous = false;
    recognition.onresult = (e) => {
      const transcript = e.results[0][0].transcript;
      setInput((prev) => prev + (prev ? " " : "") + transcript);
    };
    recognition.onend = () => setIsRecording(false);
    recognition.start();
    setIsRecording(true);
  }

  /* ---- Submit entire check-in ---- */
  async function submitCheckin() {
    setSubmitting(true);
    try {
      await api.submitMentalHealthCheckin({
        session_id: session.sessionId,
        feelings,
        triggers: triggerNotes || null,
        trigger_categories: selectedTriggers,
        intensity,
        journal_text: journalText || null,
        recommendations_feedback: recFeedback,
      });
      onAnalyzed();
      setSubmitted(true);
    } catch (err) {
      console.error("[MentalHealth] checkin submit failed:", err);
    } finally {
      setSubmitting(false);
    }
  }

  const toggleTrigger = (key) => {
    setSelectedTriggers((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  const updateFeeling = (key, val) => {
    setFeelings((prev) => ({ ...prev, [key]: val }));
  };

  /* Intensity label */
  const intensityLabel = intensity <= 2 ? "Not at all" : intensity <= 4 ? "Mild" : intensity <= 6 ? "Moderate" : intensity <= 8 ? "High" : "Very High";
  const intensityColor = intensity <= 4 ? "var(--color-teal-600)" : intensity <= 6 ? "var(--color-amber-600)" : "var(--color-coral-500)";

  return (
    <div className="patient-page pb-32 lg:pb-6">
      <div className="space-y-6">
        {/* Page header */}
        <div className="patient-page-header pt-1">
          <div className="patient-page-title">
            <div className="patient-page-title-icon" style={{ background: "var(--color-coral-50)" }}>
              <Heart size={20} style={{ color: "var(--color-coral-500)" }} />
            </div>
            <div>
              <h1 className="text-2xl font-semibold" style={{ color: "var(--color-slate-800)" }}>Mental wellness companion</h1>
              <p className="text-xs" style={{ color: "var(--color-slate-500)" }}>
                A space to be heard. Not a therapist. Listens first, doesn't rush to advice.
                {stats && ` · grounded in ${stats.total_records || 600} cleaned cases`}
              </p>
            </div>
          </div>
          <div className="patient-stat-grid">
            <div className="patient-stat-card">
              <p className="text-xs" style={{ color: "var(--color-slate-400)" }}>Check-ins</p>
              <p className="text-sm font-semibold mt-1" style={{ color: "var(--color-slate-700)" }}>{session.mentalHealthCheckins?.length || 0} saved</p>
            </div>
            <div className="patient-stat-card">
              <p className="text-xs" style={{ color: "var(--color-slate-400)" }}>Language</p>
              <p className="text-sm font-semibold mt-1" style={{ color: "var(--color-slate-700)" }}>{getLanguageName(session.language)}</p>
            </div>
          </div>
        </div>

        {/* Crisis banner */}
        {showCrisis && (
          <div className="warm-card p-4 flex items-start gap-3" style={{
            background: "var(--color-coral-50)", borderLeft: "3px solid var(--color-coral-500)"
          }}>
            <AlertCircle size={18} style={{ color: "var(--color-coral-600)", marginTop: 2 }} />
            <div className="flex-1">
              <p className="text-sm font-medium" style={{ color: "var(--color-coral-700)" }}>
                What you're feeling matters and I want you to be safe.
              </p>
              <p className="text-xs mt-1" style={{ color: "var(--color-coral-600)" }}>
                In the US: <strong>Call or text 988</strong> (Suicide & Crisis Lifeline). Outside the US: please reach a local crisis line.
              </p>
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* SECTION 1: Let's Talk                                         */}
        {/* ============================================================ */}
        <div className="warm-card p-5">
          <h2 className="font-semibold mb-1" style={{ color: "var(--color-slate-800)" }}>
            1. Let's Talk — How Are You Feeling Today?
          </h2>
          <p className="text-xs mb-4" style={{ color: "var(--color-slate-500)" }}>
            Speak or type in your language. We'll understand.
          </p>

          {/* Language badge */}
          <div className="flex items-center gap-2 mb-4">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium"
              style={{ background: "var(--color-cream-100)", border: "1px solid var(--color-cream-200)", color: "var(--color-slate-600)" }}>
              <Globe size={12} /> {getLanguageName(session.language)}
            </div>
          </div>

          {/* Mic button */}
          <div className="flex justify-center mb-3">
            <button
              onClick={toggleRecording}
              className={`mic-btn ${isRecording ? "recording" : ""}`}
            >
              {isRecording ? <MicOff size={24} style={{ color: "white" }} /> : <Mic size={24} style={{ color: "var(--color-teal-600)" }} />}
            </button>
          </div>

          {/* Divider */}
          <div className="flex items-center gap-3 mb-3">
            <div className="flex-1 h-px" style={{ background: "var(--color-cream-200)" }} />
            <span className="text-xs font-medium" style={{ color: "var(--color-slate-400)" }}>OR TYPE YOUR MESSAGE</span>
            <div className="flex-1 h-px" style={{ background: "var(--color-cream-200)" }} />
          </div>

          {/* Chat messages */}
          <div ref={scrollRef} className="space-y-3 mb-3 overflow-y-auto" style={{ maxHeight: "300px" }}>
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className="max-w-[80%] p-3 rounded-2xl"
                  style={{
                    background: m.role === "user" ? "var(--color-teal-500)" : "var(--color-cream-100)",
                    color: m.role === "user" ? "white" : "var(--color-slate-700)",
                    borderTopRightRadius: m.role === "user" ? "4px" : undefined,
                    borderTopLeftRadius: m.role === "assistant" ? "4px" : undefined,
                  }}>
                  <p className="text-sm whitespace-pre-wrap">{m.content}</p>
                  {m.role === "assistant" && i > 0 && (
                    <div className="mt-2">
                      <ListenButton text={m.content} languageCode={session.language} compact />
                    </div>
                  )}
                </div>
              </div>
            ))}
            {busy && (
              <div className="flex justify-start">
                <div className="p-3 rounded-2xl" style={{ background: "var(--color-cream-100)" }}>
                  <div className="flex gap-1">
                    {[0, 1, 2].map((i) => (
                      <span key={i} className="w-1.5 h-1.5 rounded-full"
                        style={{ background: "var(--color-slate-400)", animation: `pulse 1.4s ${i * 0.2}s infinite` }} />
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Text input */}
          <div className="flex gap-2 pt-2" style={{ borderTop: "1px solid var(--color-cream-200)" }}>
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendChat()}
              placeholder="Take your time..."
              disabled={busy}
              className="flex-1 px-3 py-2.5 rounded-xl text-sm focus:outline-none"
              style={{ background: "var(--color-cream-50)", border: "1px solid var(--color-cream-200)" }}
            />
            <button onClick={sendChat} disabled={busy || !input.trim()}
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: "var(--color-teal-500)", color: "white" }}>
              <Send size={16} />
            </button>
          </div>

          {/* System understood callout */}
          {messages.length > 2 && messages[messages.length - 1].role === "assistant" && (
            <div className="mt-3 p-3 rounded-xl" style={{ background: "var(--color-cream-100)" }}>
              <p className="text-xs" style={{ color: "var(--color-slate-500)" }}>
                <span className="font-medium" style={{ color: "var(--color-slate-600)" }}>You said:</span> "{messages[messages.length - 2]?.content}"
              </p>
              <p className="text-xs mt-1">
                <span className="font-medium" style={{ color: "var(--color-slate-600)" }}>System understood:</span>{" "}
                <span style={{ color: "var(--color-slate-700)" }}>{messages[messages.length - 1]?.content?.slice(0, 100)}</span>
              </p>
            </div>
          )}
        </div>

        {/* ============================================================ */}
        {/* SECTION 2: Your Journal                                       */}
        {/* ============================================================ */}
        <div className="warm-card p-5">
          <h2 className="font-semibold mb-1" style={{ color: "var(--color-slate-800)" }}>
            2. Your Journal — Your Story Matters
          </h2>
          <p className="text-xs mb-4" style={{ color: "var(--color-slate-500)" }}>
            Upload, write, or capture your journal.
          </p>

          {/* Tabs */}
          <div className="flex gap-0 mb-4" style={{ borderBottom: "1px solid var(--color-cream-200)" }}>
            {[
              { key: "write", label: "Write" },
              { key: "image", label: "Upload Image" },
              { key: "file", label: "Upload File" },
            ].map((tab) => (
              <button key={tab.key} onClick={() => setJournalTab(tab.key)}
                className="px-4 py-2 text-sm font-medium"
                style={{
                  color: journalTab === tab.key ? "var(--color-slate-800)" : "var(--color-slate-400)",
                  borderBottom: journalTab === tab.key ? "2px solid var(--color-slate-800)" : "2px solid transparent",
                }}>
                {tab.label}
              </button>
            ))}
          </div>

          {journalTab === "write" && (
            <div>
              <textarea
                value={journalText}
                onChange={(e) => setJournalText(e.target.value.slice(0, 2000))}
                placeholder="Write your thoughts in your own language..."
                rows={5}
                className="w-full px-3 py-3 rounded-xl text-sm focus:outline-none resize-none"
                style={{ background: "var(--color-cream-50)", border: "1px solid var(--color-cream-200)" }}
              />
              <p className="text-xs text-right mt-1" style={{ color: "var(--color-slate-400)" }}>
                {journalText.length}/2000
              </p>
            </div>
          )}

          {journalTab === "image" && (
            <div className="p-4 rounded-xl flex items-center gap-3"
              style={{ background: "var(--color-cream-50)", border: "1px dashed var(--color-cream-300)" }}>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ background: "var(--color-teal-50)" }}>
                <Image size={18} style={{ color: "var(--color-teal-600)" }} />
              </div>
              <div>
                <p className="text-sm font-medium" style={{ color: "var(--color-teal-600)" }}>Upload from Journal (Image)</p>
                <p className="text-xs" style={{ color: "var(--color-slate-400)" }}>JPG, PNG, HEIC</p>
              </div>
            </div>
          )}

          {journalTab === "file" && (
            <div className="p-4 rounded-xl flex items-center gap-3"
              style={{ background: "var(--color-cream-50)", border: "1px dashed var(--color-cream-300)" }}>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ background: "var(--color-teal-50)" }}>
                <FileText size={18} style={{ color: "var(--color-teal-600)" }} />
              </div>
              <div>
                <p className="text-sm font-medium" style={{ color: "var(--color-teal-600)" }}>Upload File (PDF, Docx, Txt)</p>
                <p className="text-xs" style={{ color: "var(--color-slate-400)" }}>Max size 10MB</p>
              </div>
            </div>
          )}

          <div className="flex items-center gap-1.5 mt-3">
            <Lock size={11} style={{ color: "var(--color-slate-400)" }} />
            <p className="text-xs" style={{ color: "var(--color-slate-400)" }}>Your journal is private and secure.</p>
          </div>
        </div>

        {/* ============================================================ */}
        {/* SECTION 3: What's Triggering You?                             */}
        {/* ============================================================ */}
        <div className="warm-card p-5">
          <h2 className="font-semibold mb-1" style={{ color: "var(--color-slate-800)" }}>
            3. What's Triggering You?
          </h2>
          <p className="text-xs mb-4" style={{ color: "var(--color-slate-500)" }}>
            Help us understand what affects your well-being.
          </p>

          {/* Intensity slider */}
          <div className="mb-5">
            <p className="text-sm font-medium mb-2" style={{ color: "var(--color-slate-700)" }}>How intense is it right now?</p>
            <div className="relative">
              <div className="relative h-3 rounded-full" style={{ background: "var(--color-cream-200)" }}>
                <div className="absolute left-0 top-0 h-full rounded-full"
                  style={{ width: `${intensity * 10}%`, background: "var(--color-teal-500)" }} />
                <input type="range" min="0" max="10" value={intensity}
                  onChange={(e) => setIntensity(parseInt(e.target.value))}
                  className="absolute inset-0 w-full opacity-0 cursor-pointer" style={{ height: "100%" }} />
                <div className="absolute -top-7 px-2 py-0.5 rounded-lg text-xs font-semibold text-white"
                  style={{ left: `calc(${intensity * 10}% - 12px)`, background: "var(--color-teal-600)" }}>
                  {intensity}
                </div>
                <div className="absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full border-2 border-white"
                  style={{ left: `calc(${intensity * 10}% - 8px)`, background: "var(--color-teal-600)", boxShadow: "0 1px 4px rgba(0,0,0,0.2)", pointerEvents: "none" }} />
              </div>
              <div className="flex justify-between mt-2">
                {["Not at all", "Mild", "Moderate", "High", "Very High"].map((l, i) => (
                  <span key={l} className="text-xs"
                    style={{ color: l === intensityLabel ? intensityColor : "var(--color-slate-400)", fontWeight: l === intensityLabel ? 600 : 400 }}>
                    {l}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Category pills */}
          <div className="mb-4">
            <p className="text-sm font-medium mb-2" style={{ color: "var(--color-slate-700)" }}>What is it regarding?</p>
            <div className="flex flex-wrap gap-2">
              {TRIGGER_CATEGORIES.map((cat) => {
                const active = selectedTriggers.includes(cat.key);
                return (
                  <button key={cat.key} onClick={() => toggleTrigger(cat.key)}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-colors"
                    style={{
                      background: active ? "var(--color-teal-50)" : "white",
                      color: active ? "var(--color-teal-700)" : "var(--color-slate-600)",
                      border: `1px solid ${active ? "var(--color-teal-300)" : "var(--color-cream-200)"}`,
                    }}>
                    <cat.icon size={14} /> {cat.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Notes */}
          <div>
            <p className="text-sm font-medium mb-2" style={{ color: "var(--color-slate-700)" }}>Anything you want to add?</p>
            <textarea
              value={triggerNotes}
              onChange={(e) => setTriggerNotes(e.target.value.slice(0, 500))}
              placeholder="Tell us more..."
              rows={3}
              className="w-full px-3 py-2.5 rounded-xl text-sm focus:outline-none resize-none"
              style={{ background: "var(--color-cream-50)", border: "1px solid var(--color-cream-200)" }}
            />
            <p className="text-xs text-right" style={{ color: "var(--color-slate-400)" }}>{triggerNotes.length}/500</p>
          </div>
        </div>

        {/* ============================================================ */}
        {/* SECTION 4: Pattern matches (from AI)                          */}
        {/* ============================================================ */}
        {matches.length > 0 && (
          <div className="warm-card p-5">
            <div className="flex items-center gap-2 mb-1">
              <Database size={14} style={{ color: "var(--color-info-600)" }} />
              <h2 className="font-semibold" style={{ color: "var(--color-slate-800)" }}>
                4. What's Helped People Like You
              </h2>
            </div>
            <p className="text-xs mb-3" style={{ color: "var(--color-slate-400)" }}>
              From anonymized cases in our dataset
            </p>
            <div className="space-y-3">
              {matches.map((m) => (
                <div key={m.id} className="p-3 rounded-xl" style={{ background: "var(--color-cream-50)" }}>
                  <p className="text-sm font-medium" style={{ color: "var(--color-slate-700)" }}>{m.title}</p>
                  <p className="text-xs mt-1" style={{ color: "var(--color-slate-500)" }}>{m.summary}</p>
                  {m.what_helped?.length > 0 && (
                    <ul className="text-xs mt-2 space-y-1" style={{ color: "var(--color-slate-600)" }}>
                      {m.what_helped.slice(0, 3).map((w, i) => (
                        <li key={i} className="flex items-start gap-1.5">
                          <Sparkles size={10} style={{ color: "var(--color-teal-500)", marginTop: 3, flexShrink: 0 }} />
                          <span>{w}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
            <p className="text-xs mt-3 italic" style={{ color: "var(--color-slate-400)" }}>
              These are patterns, not prescriptions. If anything resonates, talking to a professional is always an option.
            </p>
          </div>
        )}

        {/* ============================================================ */}
        {/* SECTION 5: Rate Your Feelings                                 */}
        {/* ============================================================ */}
        <div className="warm-card p-5">
          <h2 className="font-semibold mb-1" style={{ color: "var(--color-slate-800)" }}>
            5. Rate Your Feelings Right Now
          </h2>
          <p className="text-xs mb-4" style={{ color: "var(--color-slate-500)" }}>
            Slide to express intensity
          </p>

          <div className="space-y-1">
            <GradientSlider label="Anxiety Level" value={feelings.anxiety} onChange={(v) => updateFeeling("anxiety", v)}
              colors={["#3B82F6", "#8B5CF6", "#A78BFA"]} />
            <GradientSlider label="Stress Level" value={feelings.stress} onChange={(v) => updateFeeling("stress", v)}
              colors={["#3B82F6", "#8B5CF6", "#A78BFA"]} />
            <GradientSlider label="Energy Level" value={feelings.energy} onChange={(v) => updateFeeling("energy", v)}
              colors={["#E24B4A", "#E5A030", "#3AA882"]} />
            <GradientSlider label="Focus & Concentration" value={feelings.focus} onChange={(v) => updateFeeling("focus", v)}
              colors={["#3B82F6", "#8B5CF6", "#A78BFA"]} />
            <GradientSlider label="Hopelessness / Despair" value={feelings.hopelessness} onChange={(v) => updateFeeling("hopelessness", v)}
              colors={["#E24B4A", "#8B5CF6"]} />
            <GradientSlider label="Anger / Irritability" value={feelings.anger} onChange={(v) => updateFeeling("anger", v)}
              colors={["#E5A030", "#E24B4A"]} />
            <GradientSlider label="Confidence / Self-Esteem" value={feelings.confidence} onChange={(v) => updateFeeling("confidence", v)}
              colors={["#3B82F6", "#8B5CF6", "#3AA882"]} />
            <GradientSlider label="Feeling Overwhelmed" value={feelings.overwhelmed} onChange={(v) => updateFeeling("overwhelmed", v)}
              colors={["#3B82F6", "#8B5CF6", "#E24B4A", "#3AA882"]} />
          </div>
        </div>

        {/* ============================================================ */}
        {/* SECTION 6: Therapeutic Recommendations                        */}
        {/* ============================================================ */}
        <div className="warm-card p-5">
          <h2 className="font-semibold mb-1" style={{ color: "var(--color-slate-800)" }}>
            6. Therapeutic Recommendations
          </h2>
          <p className="text-xs mb-4" style={{ color: "var(--color-slate-500)" }}>
            Personalized suggestions based on your check-in.
          </p>

          <div className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--color-cream-200)" }}>
            {RECOMMENDATIONS.map((rec, i) => (
              <div key={i}
                className="flex items-center gap-3 p-4"
                style={{ borderBottom: i < RECOMMENDATIONS.length - 1 ? "1px solid var(--color-cream-100)" : "none" }}>
                <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ background: "var(--color-cream-100)" }}>
                  <rec.icon size={18} style={{ color: rec.color }} />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium" style={{ color: "var(--color-slate-800)" }}>{rec.label}</p>
                  <p className="text-xs" style={{ color: "var(--color-slate-500)" }}>{rec.desc}</p>
                </div>
                <ChevronRight size={16} style={{ color: "var(--color-slate-300)" }} />
              </div>
            ))}
          </div>

          <div className="flex justify-center mt-4">
            <button className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-medium"
              style={{ border: "1px solid var(--color-teal-300)", color: "var(--color-teal-600)" }}>
              View More Resources <ChevronRight size={14} />
            </button>
          </div>
        </div>

        {/* ============================================================ */}
        {/* FEEDBACK + BOOK APPOINTMENT BAR                               */}
        {/* ============================================================ */}
        <div className="warm-card p-5">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Feedback */}
            <div>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-9 h-9 rounded-full flex items-center justify-center overflow-hidden"
                  style={{ background: "var(--color-cream-200)" }}>
                  <span className="text-xs font-semibold" style={{ color: "var(--color-slate-600)" }}>
                    {(patientName[0] || "?").toUpperCase()}
                  </span>
                </div>
                <div>
                  <p className="text-sm font-medium" style={{ color: "var(--color-slate-700)" }}>{patientName}</p>
                  <p className="text-xs" style={{ color: "var(--color-slate-400)" }}>Patient</p>
                </div>
              </div>
              <p className="text-sm font-medium mb-3" style={{ color: "var(--color-slate-700)" }}>
                Did these recommendations help?
              </p>
              <div className="flex gap-2">
                <button onClick={() => setRecFeedback("helpful")}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium"
                  style={{
                    background: recFeedback === "helpful" ? "var(--color-teal-50)" : "white",
                    color: recFeedback === "helpful" ? "var(--color-teal-700)" : "var(--color-teal-600)",
                    border: `1px solid ${recFeedback === "helpful" ? "var(--color-teal-300)" : "var(--color-cream-200)"}`,
                  }}>
                  <span>👍</span> Yes, I'm feeling better!
                </button>
                <button onClick={() => setRecFeedback("need_more")}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium"
                  style={{
                    background: recFeedback === "need_more" ? "var(--color-coral-50)" : "white",
                    color: recFeedback === "need_more" ? "var(--color-coral-600)" : "var(--color-slate-600)",
                    border: `1px solid ${recFeedback === "need_more" ? "var(--color-coral-200)" : "var(--color-cream-200)"}`,
                  }}>
                  <span>👎</span> Not really, I need more support
                </button>
              </div>
            </div>

            {/* Book appointment */}
            <div className="p-4 rounded-xl" style={{ background: "var(--color-cream-50)" }}>
              <div className="flex items-start gap-2 mb-2">
                <Heart size={16} style={{ color: "var(--color-coral-500)" }} />
                <div>
                  <p className="text-sm font-semibold" style={{ color: "var(--color-slate-800)" }}>We're here for you</p>
                  <p className="text-xs mt-0.5" style={{ color: "var(--color-slate-500)" }}>
                    It's okay to need professional support. Let's connect you with a mental health provider.
                  </p>
                </div>
              </div>
              <button className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold mt-2"
                style={{ background: "var(--color-coral-400)", color: "white" }}>
                <Calendar size={14} /> Book Session with a Mental Health Provider
              </button>
              <p className="text-xs text-center mt-2" style={{ color: "var(--color-slate-400)" }}>
                Available 24/7 · Multilingual support · Secure & confidential
              </p>
            </div>
          </div>
        </div>

        {/* ============================================================ */}
        {/* SUBMIT CHECK-IN                                               */}
        {/* ============================================================ */}
        <div className="flex justify-center">
          <button
            onClick={submitCheckin}
            disabled={submitting || submitted}
            className="px-8 py-3 rounded-xl text-sm font-semibold flex items-center gap-2"
            style={{
              background: submitted ? "var(--color-teal-500)" : "var(--color-teal-600)",
              color: "white",
              opacity: submitting ? 0.7 : 1,
            }}>
            {submitted ? (
              <><Sparkles size={14} /> Check-in saved — your doctor can see the summary</>
            ) : submitting ? (
              <><div className="spinner" style={{ width: 14, height: 14, borderTopColor: "white", borderColor: "rgba(255,255,255,0.3)" }} /> Saving check-in...</>
            ) : (
              <><Send size={14} /> Submit Wellness Check-in</>
            )}
          </button>
        </div>

        {/* ============================================================ */}
        {/* PRIVACY FOOTER                                                */}
        {/* ============================================================ */}
        <div className="flex items-center justify-between flex-wrap gap-3 pt-2">
          <div className="flex items-center gap-1.5">
            <Lock size={11} style={{ color: "var(--color-slate-400)" }} />
            <p className="text-xs" style={{ color: "var(--color-slate-500)" }}>
              Your privacy is our priority. All your data is encrypted and protected.
            </p>
          </div>
          <p className="text-xs" style={{ color: "var(--color-slate-500)" }}>
            Need immediate help? <a href="tel:988" className="font-semibold" style={{ color: "var(--color-slate-700)" }}>Call 988</a> or visit{" "}
            <a href="https://findahelpline.com" target="_blank" rel="noopener noreferrer" className="font-semibold" style={{ color: "var(--color-slate-700)" }}>findahelpline.com</a>
          </p>
        </div>
      </div>
    </div>
  );
}
