import { useEffect, useState } from "react";
import {
  AlertTriangle, Check, X, Edit3, Leaf, Volume2, Users, Search, Hospital,
  Stethoscope, IdCard, Cake, BedDouble, Shield,
} from "lucide-react";
import { useSession } from "../hooks/useSession";
import { getLanguageName } from "../components/shared/UIComponents";
import { api } from "../utils/api";

function EmptyState({ icon: Icon, text }) {
  return (
    <div className="text-center py-6">
      <Icon size={24} style={{ color: "var(--color-slate-300)", margin: "0 auto 8px" }} />
      <p className="text-sm" style={{ color: "var(--color-slate-400)" }}>{text}</p>
    </div>
  );
}

// FeedbackButtons — Approve / Modify / Reject on every AI output.
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

export default function DoctorDashboard() {
  const { session } = useSession();
  const [researchQuery, setResearchQuery] = useState("");
  const [isResearching, setIsResearching] = useState(false);
  const [researchResult, setResearchResult] = useState(null);
  const [feedbackStats, setFeedbackStats] = useState(null);

  useEffect(() => {
    api.feedbackStats().then(setFeedbackStats).catch(() => {});
  }, []);

  const handleResearch = async () => {
    if (!researchQuery.trim()) return;
    setIsResearching(true); setResearchResult(null);
    try {
      const data = await api.searchKnowledge(researchQuery, session.language);
      if (data.results && data.results.length > 0) {
        setResearchResult({ found: true, insights: data.results, method: data.method });
      } else {
        setResearchResult({ found: false, query: researchQuery });
      }
    } catch { setResearchResult({ found: false, query: researchQuery }); }
    finally { setIsResearching(false); }
  };

  const hasInsights = session.symptomInsights.length > 0;
  const hasDiet = session.dietaryResults.length > 0;
  const hasVoice = session.voiceMessages.length > 0;
  const latestDiet = hasDiet ? session.dietaryResults[session.dietaryResults.length - 1] : null;

  const yob = session.patient?.year_of_birth || (session.patient?.dob ? parseInt(session.patient.dob.slice(0, 4)) : null);
  const age = yob ? new Date().getFullYear() - yob : null;

  return (
    <div className="min-h-screen" style={{ background: "var(--color-cream-50)" }}>
      <div className="max-w-6xl mx-auto p-6">
        <div className="flex items-start justify-between mb-6 gap-4 flex-wrap">
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-semibold" style={{ color: "var(--color-slate-800)" }}>
              {session.patient ? `${session.patient.first_name} ${session.patient.last_name || ""}`.trim() : "Patient overview"}
            </h1>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-xs" style={{ color: "var(--color-slate-500)" }}>
              {session.patient?.mrn && <span className="flex items-center gap-1"><IdCard size={12} /> MRN {session.patient.mrn}</span>}
              {age !== null && <span className="flex items-center gap-1"><Cake size={12} /> {age} yrs (b. {yob})</span>}
              {session.patient?.sex && <span>{session.patient.sex.replace("_", " ")}</span>}
              {session.patient?.room && <span className="flex items-center gap-1"><BedDouble size={12} /> Room {session.patient.room}</span>}
              <span>· Session #{session.sessionId.slice(-6)}</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
          <div className="warm-card p-4">
            <div className="flex items-center gap-2 mb-2">
              <Hospital size={14} style={{ color: "var(--color-teal-600)" }} />
              <p className="text-xs font-medium" style={{ color: "var(--color-slate-500)" }}>Hospital</p>
            </div>
            {session.hospital ? (
              <>
                <p className="font-medium" style={{ color: "var(--color-slate-800)" }}>{session.hospital.name}</p>
                <p className="text-xs mt-1" style={{ color: "var(--color-slate-500)" }}>{session.hospital.address}</p>
                <p className="text-xs" style={{ color: "var(--color-slate-500)" }}>{session.hospital.phone}</p>
              </>
            ) : <p className="text-sm" style={{ color: "var(--color-slate-400)" }}>—</p>}
          </div>

          <div className="warm-card p-4">
            <div className="flex items-center gap-2 mb-2">
              <Stethoscope size={14} style={{ color: "var(--color-coral-500)" }} />
              <p className="text-xs font-medium" style={{ color: "var(--color-slate-500)" }}>Assigned doctor</p>
            </div>
            {session.doctor ? (
              <>
                <p className="font-medium" style={{ color: "var(--color-slate-800)" }}>{session.doctor.name}</p>
                <p className="text-xs mt-1" style={{ color: "var(--color-slate-500)" }}>{session.doctor.specialty}</p>
                <p className="text-xs" style={{ color: "var(--color-slate-500)" }}>
                  Speaks: {(session.doctor.languages_spoken || []).join(", ")}
                </p>
                {session.doctor.npi && <p className="text-xs mt-1" style={{ color: "var(--color-slate-400)" }}>NPI: {session.doctor.npi}</p>}
              </>
            ) : <p className="text-sm" style={{ color: "var(--color-slate-400)" }}>—</p>}
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-6">
          <div className="warm-card p-3">
            <p className="text-xs" style={{ color: "var(--color-slate-400)" }}>Language</p>
            <p className="text-base font-semibold" style={{ color: "var(--color-slate-700)" }}>{getLanguageName(session.language)}</p>
          </div>
          <div className="warm-card p-3">
            <p className="text-xs" style={{ color: "var(--color-slate-400)" }}>Cultural alerts</p>
            <p className="text-base font-semibold" style={{ color: hasInsights ? "var(--color-amber-600)" : "var(--color-slate-300)" }}>
              {session.symptomInsights.length}
            </p>
          </div>
          <div className="warm-card p-3">
            <p className="text-xs" style={{ color: "var(--color-slate-400)" }}>Diet plan</p>
            <p className="text-base font-semibold" style={{ color: hasDiet ? "var(--color-teal-600)" : "var(--color-slate-300)" }}>
              {hasDiet ? "Adapted" : "Pending"}
            </p>
          </div>
          <div className="warm-card p-3">
            <p className="text-xs" style={{ color: "var(--color-slate-400)" }}>Voice messages</p>
            <p className="text-base font-semibold" style={{ color: "var(--color-slate-700)" }}>{session.voiceMessages.length}</p>
          </div>
          <div className="warm-card p-3">
            <p className="text-xs" style={{ color: "var(--color-slate-400)" }}>Care circle</p>
            <p className="text-base font-semibold" style={{ color: "var(--color-slate-700)" }}>{session.careCircle.length}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
          <div className="warm-card p-5" style={{ borderLeft: "3px solid var(--color-amber-400)", borderRadius: "0 var(--radius-lg) var(--radius-lg) 0" }}>
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-medium" style={{ color: "var(--color-slate-700)" }}>Cultural symptom insights</h2>
              {hasInsights && <span className="badge badge-warning">Review recommended</span>}
            </div>

            {!hasInsights ? (
              <EmptyState icon={AlertTriangle} text="No symptoms reported yet. Waiting for patient input." />
            ) : (
              <div className="space-y-3">
                {session.symptomInsights.map((insight) => (
                  <div key={insight.id || insight.timestamp} className="p-3 rounded-lg" style={{ background: "var(--color-cream-100)" }}>
                    {(insight.insights || []).map((ins, j) => (
                      <div key={j} className="space-y-1.5 text-sm">
                        <div><span style={{ color: "var(--color-slate-400)" }}>Expression: </span><span className="font-medium">"{ins.cultural_expression}"</span></div>
                        <div><span style={{ color: "var(--color-slate-400)" }}>Translation: </span><span>{ins.literal_translation}</span></div>
                        <div><span style={{ color: "var(--color-slate-400)" }}>Clinical: </span><span>{ins.clinical_mapping}</span></div>
                        {ins.icd10_codes?.length > 0 && (
                          <div className="flex items-center gap-1 flex-wrap">
                            <span style={{ color: "var(--color-slate-400)" }}>ICD-10:</span>
                            {ins.icd10_codes.map((c) => <span key={c} className="badge badge-info">{c}</span>)}
                          </div>
                        )}
                        {ins.recommended_screenings?.length > 0 && (
                          <div><span style={{ color: "var(--color-slate-400)" }}>Screenings: </span>
                            <span style={{ color: "var(--color-amber-600)" }}>{ins.recommended_screenings.join(", ")}</span></div>
                        )}
                        <div className="flex items-center gap-2 mt-1">
                          <span className={`badge ${ins.confidence === "high" ? "badge-success" : ins.confidence === "medium" ? "badge-warning" : "badge-danger"}`}>
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
          </div>

          <div className="warm-card p-5" style={{ borderLeft: "3px solid var(--color-teal-400)", borderRadius: "0 var(--radius-lg) var(--radius-lg) 0" }}>
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-medium" style={{ color: "var(--color-slate-700)" }}>Dietary adaptation</h2>
              {hasDiet && <span className="badge badge-success">Adapted</span>}
            </div>

            {!hasDiet ? (
              <EmptyState icon={Leaf} text="No food data yet. Waiting for family to upload a photo." />
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

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
          <div className="warm-card p-5">
            <div className="flex items-center gap-2 mb-3">
              <Users size={16} style={{ color: "var(--color-slate-400)" }} />
              <h2 className="font-medium" style={{ color: "var(--color-slate-700)" }}>Care circle</h2>
            </div>

            {session.careCircle.length === 0 ? (
              <p className="text-sm" style={{ color: "var(--color-slate-400)" }}>
                No family members joined yet. Patient join code: <span className="font-mono">{session.joinCode || "—"}</span>
              </p>
            ) : (
              session.careCircle.map((m) => (
                <div key={m.id} className="flex items-center gap-3 py-2" style={{ borderBottom: "1px solid var(--color-cream-200)" }}>
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium"
                    style={{ background: "var(--color-info-50)", color: "var(--color-info-700)" }}>
                    {m.initials || (m.name || "?")[0]}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium" style={{ color: "var(--color-slate-700)" }}>{m.name}</p>
                    <p className="text-xs" style={{ color: "var(--color-slate-400)" }}>
                      {m.relationship}{m.language_code ? ` · ${getLanguageName(m.language_code)}` : ""}
                    </p>
                  </div>
                  {m.messagesTotal > 0 ? (
                    <span className={`badge ${m.messagesHeard === m.messagesTotal ? "badge-success" : "badge-warning"}`}>
                      {m.messagesHeard}/{m.messagesTotal} heard
                    </span>
                  ) : (
                    <span className="text-xs" style={{ color: "var(--color-slate-400)" }}>No messages yet</span>
                  )}
                </div>
              ))
            )}

            {hasVoice && (
              <div className="mt-3 space-y-2">
                <p className="text-xs font-medium" style={{ color: "var(--color-slate-400)" }}>Recent voice messages:</p>
                {session.voiceMessages.slice(-3).reverse().map((msg) => (
                  <div key={msg.id || msg.timestamp} className="text-xs p-2 rounded-lg" style={{ background: "var(--color-cream-100)" }}>
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

          <div className="warm-card p-5">
            <div className="flex items-center gap-2 mb-3">
              <Search size={16} style={{ color: "var(--color-slate-400)" }} />
              <h2 className="font-medium" style={{ color: "var(--color-slate-700)" }}>Look up cultural expression</h2>
            </div>
            <p className="text-xs mb-3" style={{ color: "var(--color-slate-400)" }}>
              Atlas Vector Search over 37 clinically-validated entries. AI fallback flagged when validated source isn't available.
            </p>

            <div className="flex gap-2">
              <input value={researchQuery} onChange={(e) => setResearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleResearch()}
                placeholder='e.g., "susto" or "trung gio"'
                className="flex-1 px-3 py-2 rounded-lg text-sm focus:outline-none"
                style={{ background: "var(--color-cream-100)", border: "1px solid var(--color-cream-200)" }} />
              <button onClick={handleResearch} disabled={!researchQuery.trim() || isResearching}
                className="btn-primary text-sm px-4 py-2 flex items-center gap-1">
                {isResearching ? <div className="spinner" style={{ width: 14, height: 14, borderTopColor: "white", borderColor: "rgba(255,255,255,0.3)" }} /> : <Search size={14} />}
                Search
              </button>
            </div>

            {researchResult?.found && (
              <div className="mt-3 space-y-2">
                <span className={`badge ${researchResult.method === "atlas_vector_search" ? "badge-info" : "badge-success"}`}>
                  {researchResult.method === "atlas_vector_search" ? "Atlas Vector Search" : researchResult.method}
                </span>
                {researchResult.insights.map((ins, i) => (
                  <div key={i} className="p-3 rounded-lg text-xs" style={{ background: "var(--color-cream-100)" }}>
                    <p><span style={{ color: "var(--color-slate-400)" }}>Expression: </span>
                      <span className="font-medium">"{ins.cultural_expression}"</span>
                      {ins._vector_score && <span className="ml-2" style={{ color: "var(--color-info-600)" }}>score: {ins._vector_score.toFixed(3)}</span>}
                    </p>
                    <p><span style={{ color: "var(--color-slate-400)" }}>Clinical: </span>{ins.clinical_mapping}</p>
                    {ins.recommended_screenings?.length > 0 && (
                      <p><span style={{ color: "var(--color-slate-400)" }}>Screenings: </span>
                        <span style={{ color: "var(--color-amber-600)" }}>{ins.recommended_screenings.join(", ")}</span></p>
                    )}
                    <FeedbackButtons sessionId={session.sessionId} doctorId={session.doctor?.id}
                      targetType="knowledge_search" targetId={ins.id || `${ins.cultural_expression}-${i}`} />
                  </div>
                ))}
              </div>
            )}

            {researchResult && !researchResult.found && (
              <div className="mt-3 p-3 rounded-lg" style={{ background: "var(--color-amber-50)" }}>
                <p className="text-xs" style={{ color: "var(--color-amber-600)" }}>
                  No matches for "{researchResult.query}". Consider consulting a cultural liaison or interpreter.
                </p>
              </div>
            )}

            {feedbackStats && feedbackStats.total > 0 && (
              <div className="mt-4 pt-3" style={{ borderTop: "1px solid var(--color-cream-200)" }}>
                <p className="text-xs font-medium mb-2" style={{ color: "var(--color-slate-500)" }}>Doctor feedback (audit trail)</p>
                <div className="flex flex-wrap gap-3 text-xs">
                  <span style={{ color: "var(--color-teal-600)" }}>✓ {feedbackStats.approved} approved</span>
                  <span style={{ color: "var(--color-amber-600)" }}>~ {feedbackStats.modified} modified</span>
                  <span style={{ color: "var(--color-danger-500)" }}>✗ {feedbackStats.rejected} rejected</span>
                  <span style={{ color: "var(--color-slate-400)" }}>· {(feedbackStats.approval_rate * 100).toFixed(0)}% approval rate</span>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-start gap-2 p-3 rounded-lg" style={{ background: "var(--color-teal-50)" }}>
          <Shield size={14} style={{ color: "var(--color-teal-500)", marginTop: 2 }} />
          <p className="text-xs" style={{ color: "var(--color-teal-700)" }}>
            All AI outputs are reviewable. Doctor verdicts are persisted to <code>doctor_feedback</code> with timestamps —
            full audit trail for clinical compliance. Audio is processed on-device.
          </p>
        </div>
      </div>
    </div>
  );
}
