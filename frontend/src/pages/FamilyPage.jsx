import { useState } from "react";
import { Users, Plus, Phone, Mail, X, Copy, Check, Volume2, Globe } from "lucide-react";
import { useSession } from "../hooks/useSession";
import { LanguageSelector, getLanguageName } from "../components/shared/UIComponents";

const RELATIONSHIPS = ["Daughter", "Son", "Spouse", "Parent", "Sibling", "Grandchild", "Caregiver", "Neighbor", "Friend", "Other"];

export default function FamilyPage() {
  const { session, addCareCircleMember, removeCareCircleMember } = useSession();
  const [showAdd, setShowAdd] = useState(false);
  const [name, setName] = useState("");
  const [relationship, setRelationship] = useState("Daughter");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [language, setLanguage] = useState(session.language || "en");
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState(null);

  async function handleAdd() {
    if (!name.trim()) return;
    setBusy(true); setError(null);
    try {
      await addCareCircleMember({
        name: name.trim(),
        relationship,
        phone: phone.trim() || null,
        email: email.trim() || null,
        language_code: language,
      });
      setName(""); setPhone(""); setEmail(""); setShowAdd(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  function copyJoinCode() {
    if (!session.joinCode) return;
    navigator.clipboard.writeText(session.joinCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center gap-2 mb-6">
          <Users size={20} style={{ color: "var(--color-coral-500)" }} />
          <h1 className="text-xl font-semibold" style={{ color: "var(--color-slate-800)" }}>Care circle</h1>
        </div>

        {/* Join-code card — anyone can scan-or-type to join this session */}
        {session.joinCode && (
          <div className="warm-card p-5 mb-4" style={{
            background: "linear-gradient(135deg, var(--color-teal-50) 0%, var(--color-cream-50) 100%)",
          }}>
            <p className="text-xs mb-1" style={{ color: "var(--color-slate-500)" }}>
              Share this 6-digit code with family members so they can join from any device
            </p>
            <div className="flex items-center gap-3">
              <p className="text-3xl font-semibold tracking-widest" style={{ color: "var(--color-teal-700)" }}>
                {session.joinCode}
              </p>
              <button onClick={copyJoinCode} className="p-2 rounded-lg" style={{ background: "var(--color-cream-100)" }}>
                {copied ? <Check size={16} style={{ color: "var(--color-teal-600)" }} /> : <Copy size={16} style={{ color: "var(--color-slate-500)" }} />}
              </button>
              <span className="text-xs ml-auto" style={{ color: "var(--color-slate-500)" }}>
                Live · syncs every 5s
              </span>
            </div>
          </div>
        )}

        {/* Member list */}
        <div className="warm-card p-5 mb-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-medium" style={{ color: "var(--color-slate-700)" }}>
              {session.careCircle.length} member{session.careCircle.length === 1 ? "" : "s"}
            </h2>
            <button onClick={() => setShowAdd(true)} className="btn-primary text-sm flex items-center gap-1">
              <Plus size={14} /> Add member
            </button>
          </div>

          {session.careCircle.length === 0 ? (
            <div className="text-center py-8">
              <Users size={28} style={{ color: "var(--color-slate-300)", margin: "0 auto 8px" }} />
              <p className="text-sm" style={{ color: "var(--color-slate-400)" }}>
                No one in the care circle yet. Add the patient's family or share the join code.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {session.careCircle.map((m) => (
                <div key={m.id} className="flex items-center gap-3 p-3 rounded-lg" style={{ background: "var(--color-cream-100)" }}>
                  <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium"
                    style={{ background: "var(--color-info-50)", color: "var(--color-info-700)" }}>
                    {m.initials || (m.name || "?")[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate" style={{ color: "var(--color-slate-800)" }}>{m.name}</p>
                    <p className="text-xs" style={{ color: "var(--color-slate-500)" }}>
                      {m.relationship}
                      {m.language_code && ` · ${getLanguageName(m.language_code)}`}
                    </p>
                    {(m.phone || m.email) && (
                      <p className="text-xs mt-0.5" style={{ color: "var(--color-slate-400)" }}>
                        {m.phone && <span className="inline-flex items-center gap-1 mr-3"><Phone size={10} />{m.phone}</span>}
                        {m.email && <span className="inline-flex items-center gap-1"><Mail size={10} />{m.email}</span>}
                      </p>
                    )}
                  </div>
                  {m.messagesTotal > 0 && (
                    <span className="text-xs flex items-center gap-1 px-2 py-1 rounded-full"
                      style={{ background: "var(--color-coral-50)", color: "var(--color-coral-600)" }}>
                      <Volume2 size={10} />{m.messagesHeard}/{m.messagesTotal}
                    </span>
                  )}
                  <button onClick={() => removeCareCircleMember(m.id)}
                    className="p-1.5 rounded-lg opacity-50 hover:opacity-100"
                    style={{ color: "var(--color-slate-400)" }}>
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Add modal/inline form */}
        {showAdd && (
          <div className="warm-card p-5 mb-4 space-y-3" style={{ borderLeft: "3px solid var(--color-coral-400)" }}>
            <div className="flex items-center justify-between">
              <h3 className="font-medium" style={{ color: "var(--color-slate-700)" }}>Add a family member</h3>
              <button onClick={() => setShowAdd(false)} className="text-sm" style={{ color: "var(--color-slate-400)" }}>Cancel</button>
            </div>

            <div>
              <label className="text-xs block mb-1" style={{ color: "var(--color-slate-500)" }}>Name *</label>
              <input value={name} onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Trang Nguyen"
                className="w-full px-3 py-2 rounded-lg focus:outline-none"
                style={{ background: "var(--color-cream-100)", border: "1px solid var(--color-cream-200)" }} />
            </div>

            <div>
              <label className="text-xs block mb-1" style={{ color: "var(--color-slate-500)" }}>Relationship *</label>
              <div className="flex flex-wrap gap-2">
                {RELATIONSHIPS.map((r) => (
                  <button key={r} onClick={() => setRelationship(r)}
                    className="px-3 py-1 rounded-full text-xs"
                    style={{
                      background: relationship === r ? "var(--color-coral-500)" : "var(--color-cream-100)",
                      color: relationship === r ? "white" : "var(--color-slate-600)",
                      border: "1px solid var(--color-cream-200)",
                    }}>
                    {r}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs block mb-1" style={{ color: "var(--color-slate-500)" }}>Phone</label>
                <input value={phone} onChange={(e) => setPhone(e.target.value)}
                  placeholder="(555) 555-1234"
                  className="w-full px-3 py-2 rounded-lg focus:outline-none"
                  style={{ background: "var(--color-cream-100)", border: "1px solid var(--color-cream-200)" }} />
              </div>
              <div>
                <label className="text-xs block mb-1" style={{ color: "var(--color-slate-500)" }}>Email</label>
                <input value={email} onChange={(e) => setEmail(e.target.value)}
                  placeholder="optional"
                  className="w-full px-3 py-2 rounded-lg focus:outline-none"
                  style={{ background: "var(--color-cream-100)", border: "1px solid var(--color-cream-200)" }} />
              </div>
            </div>

            <div>
              <label className="text-xs block mb-1 flex items-center gap-1" style={{ color: "var(--color-slate-500)" }}>
                <Globe size={11} /> Preferred language for voice messages
              </label>
              <LanguageSelector selected={language} onSelect={setLanguage} />
            </div>

            {error && <p className="text-xs" style={{ color: "var(--color-danger-500)" }}>{error}</p>}

            <button onClick={handleAdd} disabled={busy || !name.trim()} className="btn-primary w-full">
              {busy ? "Adding..." : "Add to care circle"}
            </button>
          </div>
        )}

        <p className="text-xs text-center" style={{ color: "var(--color-slate-400)" }}>
          Care circle members can join this session by entering the 6-digit code on their own device.
          Voice care messages are delivered to all members in their preferred language.
        </p>
      </div>
    </div>
  );
}
