import { useEffect, useRef, useState } from "react";
import { Heart, Send, AlertCircle, Sparkles, Database } from "lucide-react";
import { useSession } from "../hooks/useSession";
import { ListenButton } from "../components/shared/UIComponents";
import { api } from "../utils/api";

const CRISIS_TRIGGERS = /(suicid|kill myself|kill mself|end my life|end it all|hurt myself|self.?harm|i want to die|don't want to live)/i;

export default function MentalHealthPage() {
  const { session } = useSession();
  const [messages, setMessages] = useState([
    { role: "assistant", content: "Hi. I'm here to listen. Take your time — what's on your mind?" },
  ]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [matches, setMatches] = useState([]);
  const [stats, setStats] = useState(null);
  const [showCrisis, setShowCrisis] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    api.getMentalHealthStats().then(setStats).catch(() => {});
  }, []);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, busy]);

  async function send() {
    const text = input.trim();
    if (!text || busy) return;

    if (CRISIS_TRIGGERS.test(text)) setShowCrisis(true);

    setMessages((m) => [...m, { role: "user", content: text }]);
    setInput("");
    setBusy(true);

    // Pattern lookup runs in parallel with the chat call.
    api.matchMentalHealthPattern(text, 2).then((res) => setMatches(res.matches || [])).catch(() => {});

    try {
      const result = await api.chat(
        text,
        session.sessionId,
        session.language,
        session.patientContext,
        messages.map((m) => ({ role: m.role, content: m.content })),
        "mental_health"
      );
      const reply = result.response || result.reply || "I'm here. Tell me a little more?";
      setMessages((m) => [...m, { role: "assistant", content: reply, method: result.method }]);
    } catch (err) {
      setMessages((m) => [...m, { role: "assistant", content: "I lost connection for a moment. I'm still here when you're ready.", method: "error" }]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center gap-2 mb-2">
          <Heart size={20} style={{ color: "var(--color-coral-500)" }} />
          <h1 className="text-xl font-semibold" style={{ color: "var(--color-slate-800)" }}>Mental wellness companion</h1>
        </div>
        <p className="text-xs mb-4" style={{ color: "var(--color-slate-500)" }}>
          A space to be heard. Not a therapist. Listens first, doesn't rush to advice.
          {stats && ` · grounded in ${stats.total_records || 600} cleaned cases (${(stats.labels || []).slice(0,3).join(", ")}…)`}
        </p>

        {showCrisis && (
          <div className="warm-card p-4 mb-4 flex items-start gap-3" style={{
            background: "var(--color-coral-50)", borderLeft: "3px solid var(--color-coral-500)"
          }}>
            <AlertCircle size={18} style={{ color: "var(--color-coral-600)", marginTop: 2 }} />
            <div className="flex-1">
              <p className="text-sm font-medium" style={{ color: "var(--color-coral-700)" }}>
                What you're feeling matters and I want you to be safe.
              </p>
              <p className="text-xs mt-1" style={{ color: "var(--color-coral-600)" }}>
                In the US: <strong>Call or text 988</strong> (Suicide & Crisis Lifeline). Outside the US: please reach a local crisis line. I'll stay here with you.
              </p>
            </div>
          </div>
        )}

        {/* Chat */}
        <div className="warm-card p-4 mb-4 flex flex-col" style={{ minHeight: "400px" }}>
          <div ref={scrollRef} className="flex-1 space-y-3 mb-3 overflow-y-auto" style={{ maxHeight: "60vh" }}>
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
                    {[0,1,2].map((i) => (
                      <span key={i} className="w-1.5 h-1.5 rounded-full"
                        style={{ background: "var(--color-slate-400)", animation: `pulse 1.4s ${i * 0.2}s infinite` }} />
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="flex gap-2 pt-2" style={{ borderTop: "1px solid var(--color-cream-200)" }}>
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && send()}
              placeholder="Take your time..."
              disabled={busy}
              className="flex-1 px-3 py-2 rounded-lg focus:outline-none"
              style={{ background: "var(--color-cream-100)", border: "1px solid var(--color-cream-200)" }} />
            <button onClick={send} disabled={busy || !input.trim()} className="btn-primary px-4 flex items-center gap-1">
              <Send size={14} />
            </button>
          </div>
        </div>

        {/* Pattern matches from the dataset — non-judgmental, surfaced quietly */}
        {matches.length > 0 && (
          <div className="warm-card p-4">
            <div className="flex items-center gap-2 mb-3">
              <Database size={14} style={{ color: "var(--color-info-600)" }} />
              <h2 className="text-sm font-medium" style={{ color: "var(--color-slate-700)" }}>
                What's helped people in similar situations
              </h2>
              <span className="text-xs" style={{ color: "var(--color-slate-400)" }}>
                · from anonymized cases in our dataset
              </span>
            </div>
            <div className="space-y-3">
              {matches.map((m) => (
                <div key={m.id} className="p-3 rounded-lg" style={{ background: "var(--color-cream-100)" }}>
                  <p className="text-xs font-medium" style={{ color: "var(--color-slate-700)" }}>{m.title}</p>
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
                  {m.screening_recommendations?.length > 0 && (
                    <p className="text-xs mt-2" style={{ color: "var(--color-slate-400)" }}>
                      Screening tools sometimes used: {m.screening_recommendations.join(", ")}
                    </p>
                  )}
                </div>
              ))}
            </div>
            <p className="text-xs mt-3 italic" style={{ color: "var(--color-slate-400)" }}>
              These are patterns, not prescriptions. If anything resonates, talking to a professional is always an option.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
