import { useState } from "react";
import { AlertTriangle, Check, Leaf, Volume2, Users, Search, Clock, Shield, ChevronRight } from "lucide-react";
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

export default function DoctorDashboard() {
  const { session } = useSession();
  const [researchQuery, setResearchQuery] = useState("");
  const [isResearching, setIsResearching] = useState(false);
  const [researchResult, setResearchResult] = useState(null);

  const handleResearch = async () => {
    if (!researchQuery.trim()) return;
    setIsResearching(true);
    setResearchResult(null);
    try {
      const data = await api.analyzeSymptoms(researchQuery, session.language);
      if (data.insights && data.insights.length > 0) {
        setResearchResult({ found: true, insights: data.insights, method: data.method });
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

  return (
    <div className="min-h-screen" style={{ background: "var(--color-cream-50)" }}>
      <div className="max-w-6xl mx-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-semibold" style={{ color: "var(--color-slate-800)" }}>Patient overview</h1>
            <p className="text-sm" style={{ color: "var(--color-slate-400)" }}>Session #{session.sessionId.slice(-6)}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          <div className="warm-card p-4">
            <p className="text-xs" style={{ color: "var(--color-slate-400)" }}>Language</p>
            <p className="text-lg font-semibold" style={{ color: "var(--color-slate-700)" }}>{getLanguageName(session.language)}</p>
          </div>
          <div className="warm-card p-4">
            <p className="text-xs" style={{ color: "var(--color-slate-400)" }}>Cultural alerts</p>
            <p className="text-lg font-semibold" style={{ color: hasInsights ? "var(--color-amber-600)" : "var(--color-slate-300)" }}>{session.symptomInsights.length}</p>
          </div>
          <div className="warm-card p-4">
            <p className="text-xs" style={{ color: "var(--color-slate-400)" }}>Diet plan</p>
            <p className="text-lg font-semibold" style={{ color: hasDiet ? "var(--color-teal-600)" : "var(--color-slate-300)" }}>{hasDiet ? "Adapted" : "Pending"}</p>
          </div>
          <div className="warm-card p-4">
            <p className="text-xs" style={{ color: "var(--color-slate-400)" }}>Voice messages</p>
            <p className="text-lg font-semibold" style={{ color: "var(--color-slate-700)" }}>{session.voiceMessages.length} sent</p>
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
                {session.symptomInsights.map((insight, i) => (
                  <div key={i} className="p-3 rounded-lg" style={{ background: "var(--color-cream-100)" }}>
                    <div className="space-y-1.5 text-sm">
                      <div><span style={{ color: "var(--color-slate-400)" }}>Expression: </span><span className="font-medium">"{insight.cultural_expression}"</span></div>
                      <div><span style={{ color: "var(--color-slate-400)" }}>Translation: </span><span>{insight.literal_translation}</span></div>
                      <div><span style={{ color: "var(--color-slate-400)" }}>Clinical significance: </span><span>{insight.clinical_mapping}</span></div>
                      {insight.icd10_codes?.length > 0 && (
                        <div className="flex items-center gap-1 flex-wrap">
                          <span style={{ color: "var(--color-slate-400)" }}>ICD-10: </span>
                          {insight.icd10_codes.map((c) => <span key={c} className="badge badge-info">{c}</span>)}
                        </div>
                      )}
                      {insight.recommended_screenings?.length > 0 && (
                        <div><span style={{ color: "var(--color-slate-400)" }}>Recommended screenings: </span><span style={{ color: "var(--color-amber-600)" }}>{insight.recommended_screenings.join(", ")}</span></div>
                      )}
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`badge ${insight.confidence === "high" ? "badge-success" : insight.confidence === "medium" ? "badge-warning" : "badge-danger"}`}>
                          {insight.confidence} confidence
                        </span>
                        {insight.source && <span className="text-xs italic" style={{ color: "var(--color-slate-400)" }}>{insight.source}</span>}
                      </div>
                    </div>
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
                <div><span style={{ color: "var(--color-slate-400)" }}>Dish: </span><span className="font-medium">{latestDiet.dish_name} ({latestDiet.dish_name_english})</span></div>
                <div><span style={{ color: "var(--color-slate-400)" }}>Cuisine: </span><span>{latestDiet.cuisine}</span></div>
                {latestDiet.nutrition_original && (
                  <>
                    <div><span style={{ color: "var(--color-slate-400)" }}>Sodium (original): </span><span style={{ color: "var(--color-danger-500)" }}>{latestDiet.nutrition_original.sodium_mg}mg</span></div>
                    <div><span style={{ color: "var(--color-slate-400)" }}>Sodium (adapted): </span><span style={{ color: "var(--color-teal-600)" }}>{latestDiet.nutrition_adapted.sodium_mg}mg</span></div>
                  </>
                )}
                {latestDiet.adaptation_notes && <div><span style={{ color: "var(--color-slate-400)" }}>Changes: </span><span>{latestDiet.adaptation_notes}</span></div>}
                {latestDiet.hospital_meal_plan && (
                  <div className="p-2 rounded-lg mt-2" style={{ background: "var(--color-teal-50)" }}>
                    <p className="text-xs font-medium" style={{ color: "var(--color-teal-700)" }}>Hospital meal plan:</p>
                    <p className="text-xs mt-1" style={{ color: "var(--color-teal-600)" }}>{latestDiet.hospital_meal_plan}</p>
                  </div>
                )}
                {latestDiet.cultural_notes && (
                  <div className="p-2 rounded-lg mt-2" style={{ background: "var(--color-coral-50)" }}>
                    <p className="text-xs font-medium" style={{ color: "var(--color-coral-500)" }}>Cultural context:</p>
                    <p className="text-xs mt-1" style={{ color: "var(--color-slate-600)" }}>{latestDiet.cultural_notes}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
          <div className="warm-card p-5">
            <div className="flex items-center gap-2 mb-3">
              <Users size={16} style={{ color: "var(--color-slate-400)" }} />
              <h2 className="font-medium" style={{ color: "var(--color-slate-700)" }}>Family communication status</h2>
            </div>

            {session.careCircle.map((m) => (
              <div key={m.id} className="flex items-center gap-3 py-2" style={{ borderBottom: "1px solid var(--color-cream-200)" }}>
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium" style={{ background: "var(--color-info-50)", color: "var(--color-info-700)" }}>{m.initials}</div>
                <div className="flex-1">
                  <p className="text-sm font-medium" style={{ color: "var(--color-slate-700)" }}>{m.name}</p>
                  <p className="text-xs" style={{ color: "var(--color-slate-400)" }}>{m.role}</p>
                </div>
                {m.messagesTotal > 0 ? (
                  <span className={`badge ${m.messagesHeard === m.messagesTotal ? "badge-success" : "badge-warning"}`}>
                    {m.messagesHeard}/{m.messagesTotal} heard
                  </span>
                ) : (
                  <span className="text-xs" style={{ color: "var(--color-slate-400)" }}>No messages yet</span>
                )}
              </div>
            ))}

            {hasVoice && (
              <div className="mt-3 space-y-2">
                <p className="text-xs font-medium" style={{ color: "var(--color-slate-400)" }}>Recent messages:</p>
                {session.voiceMessages.slice(0, 3).map((msg) => (
                  <div key={msg.id} className="flex items-center gap-2 text-xs p-2 rounded-lg" style={{ background: "var(--color-cream-100)" }}>
                    <Volume2 size={12} style={{ color: "var(--color-coral-400)" }} />
                    <span style={{ color: "var(--color-slate-600)" }}>{msg.typeLabel}</span>
                    <span style={{ color: "var(--color-slate-400)" }}>{msg.timestamp}</span>
                    <Check size={12} style={{ color: "var(--color-teal-500)" }} className="ml-auto" />
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
              Search any cultural symptom expression to understand its clinical significance. If not found in our validated database, the system will research it using AI.
            </p>

            <div className="flex gap-2">
              <input value={researchQuery} onChange={(e) => setResearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleResearch()}
                placeholder='e.g., "susto" or "trung gio"'
                className="flex-1 px-3 py-2 rounded-lg text-sm focus:outline-none"
                style={{ background: "var(--color-cream-100)", border: "1px solid var(--color-cream-200)", color: "var(--color-slate-700)" }} />
              <button onClick={handleResearch} disabled={!researchQuery.trim() || isResearching}
                className="btn-primary text-sm px-4 py-2 flex items-center gap-1">
                {isResearching ? <div className="spinner" style={{ width: 14, height: 14, borderTopColor: "white", borderColor: "rgba(255,255,255,0.3)" }} /> : <Search size={14} />}
                Search
              </button>
            </div>

            {isResearching && (
              <div className="flex items-center gap-2 mt-3 text-xs" style={{ color: "var(--color-slate-400)" }}>
                <div className="spinner" />
                Searching cultural knowledge base...
              </div>
            )}

            {researchResult && researchResult.found && (
              <div className="mt-3 space-y-2">
                {researchResult.method === "knowledge_base_only" && (
                  <span className="badge badge-success">Validated clinical source</span>
                )}
                {researchResult.method !== "knowledge_base_only" && (
                  <span className="badge badge-warning">AI-generated — verify before clinical use</span>
                )}
                {researchResult.insights.map((ins, i) => (
                  <div key={i} className="p-3 rounded-lg text-xs" style={{ background: "var(--color-cream-100)" }}>
                    <p><span style={{ color: "var(--color-slate-400)" }}>Expression: </span><span className="font-medium">"{ins.cultural_expression}"</span></p>
                    <p><span style={{ color: "var(--color-slate-400)" }}>Clinical: </span>{ins.clinical_mapping}</p>
                    {ins.recommended_screenings?.length > 0 && (
                      <p><span style={{ color: "var(--color-slate-400)" }}>Screenings: </span><span style={{ color: "var(--color-amber-600)" }}>{ins.recommended_screenings.join(", ")}</span></p>
                    )}
                  </div>
                ))}
              </div>
            )}

            {researchResult && !researchResult.found && (
              <div className="mt-3 p-3 rounded-lg" style={{ background: "var(--color-amber-50)" }}>
                <p className="text-xs" style={{ color: "var(--color-amber-600)" }}>
                  No matches found for "{researchResult.query}" in the cultural knowledge base. Consider consulting a cultural liaison or medical interpreter for this expression.
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-start gap-2 p-3 rounded-lg" style={{ background: "var(--color-teal-50)" }}>
          <Shield size={14} style={{ color: "var(--color-teal-500)", marginTop: 2 }} />
          <p className="text-xs" style={{ color: "var(--color-teal-700)" }}>
            All data displayed uses session tokens, not patient identifiers. Audio was processed on-device. No PII was sent to any AI model.
          </p>
        </div>
      </div>
    </div>
  );
}
