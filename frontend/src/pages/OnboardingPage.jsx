import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Hospital, Stethoscope, User, ArrowRight, KeyRound, Globe } from "lucide-react";
import { useSession } from "../hooks/useSession";
import { LanguageSelector, getLanguageName } from "../components/shared/UIComponents";
import { api } from "../utils/api";

const CURRENT_YEAR = new Date().getFullYear();

export default function OnboardingPage() {
  const { completeOnboarding, joinByCode } = useSession();
  const navigate = useNavigate();

  const [step, setStep] = useState(0); // 0 = pick mode, 1 = demographics, 2 = hospital, 3 = doctor, 4 = language
  const [mode, setMode] = useState(null); // "create" or "join"

  // Demographics
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [yearOfBirth, setYearOfBirth] = useState("");
  const [sex, setSex] = useState("");

  // Hospital + doctor
  const [hospitals, setHospitals] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [hospitalId, setHospitalId] = useState("");
  const [doctorId, setDoctorId] = useState("");

  // Language
  const [language, setLanguage] = useState("en");

  // Join flow
  const [joinCode, setJoinCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.listHospitals().then(({ hospitals }) => setHospitals(hospitals)).catch(() => {});
  }, []);

  useEffect(() => {
    if (!hospitalId) { setDoctors([]); setDoctorId(""); return; }
    api.listDoctors(hospitalId).then(({ doctors }) => setDoctors(doctors)).catch(() => {});
  }, [hospitalId]);

  const yobValid = /^\d{4}$/.test(yearOfBirth) && +yearOfBirth >= 1900 && +yearOfBirth <= CURRENT_YEAR;
  const canSubmit = firstName.trim().length > 0 && yobValid && sex && hospitalId && doctorId && language;

  async function handleCreate() {
    if (!canSubmit) return;
    setBusy(true);
    setError(null);
    try {
      await completeOnboarding({
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        year_of_birth: parseInt(yearOfBirth),
        sex,
        language_code: language,
        hospital_id: hospitalId,
        assigned_doctor_id: doctorId,
      });
      navigate("/");
    } catch (err) {
      setError(err.message || "Could not start session.");
    } finally {
      setBusy(false);
    }
  }

  async function handleJoin() {
    if (!/^\d{6}$/.test(joinCode.trim())) {
      setError("Enter the 6-digit code from the patient's device.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await joinByCode(joinCode.trim());
      navigate("/");
    } catch (err) {
      setError(err.message || "Code not recognized.");
    } finally {
      setBusy(false);
    }
  }

  // ---- UI ------------------------------------------------------------------
  return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ background: "var(--color-cream-50)" }}>
      <div className="w-full max-w-xl">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-semibold" style={{ color: "var(--color-slate-800)" }}>Voices of Home</h1>
          <p className="text-sm mt-1" style={{ color: "var(--color-slate-500)" }}>
            We do not translate words. We translate worlds.
          </p>
        </div>

        {step === 0 && (
          <div className="warm-card p-6 space-y-3">
            <h2 className="font-medium mb-4" style={{ color: "var(--color-slate-700)" }}>Get started</h2>

            <button
              onClick={() => { setMode("create"); setStep(1); }}
              className="w-full p-4 rounded-lg flex items-start gap-3 text-left"
              style={{ background: "var(--color-cream-100)", border: "1px solid var(--color-cream-200)" }}>
              <User size={20} style={{ color: "var(--color-teal-600)", marginTop: 2 }} />
              <div>
                <p className="font-medium" style={{ color: "var(--color-slate-800)" }}>Start a new patient session</p>
                <p className="text-xs mt-1" style={{ color: "var(--color-slate-500)" }}>For families arriving with a new patient.</p>
              </div>
            </button>

            <button
              onClick={() => { setMode("join"); }}
              className="w-full p-4 rounded-lg flex items-start gap-3 text-left"
              style={{ background: "var(--color-cream-100)", border: "1px solid var(--color-cream-200)" }}>
              <KeyRound size={20} style={{ color: "var(--color-coral-500)", marginTop: 2 }} />
              <div className="flex-1">
                <p className="font-medium" style={{ color: "var(--color-slate-800)" }}>Join with a 6-digit code</p>
                <p className="text-xs mt-1" style={{ color: "var(--color-slate-500)" }}>Family member joining from a phone, or doctor on a tablet.</p>
              </div>
            </button>

            {mode === "join" && (
              <div className="space-y-2 pt-2">
                <input
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="123456"
                  inputMode="numeric"
                  maxLength={6}
                  className="w-full px-4 py-3 rounded-lg text-center text-xl tracking-widest focus:outline-none"
                  style={{ background: "var(--color-cream-100)", border: "1px solid var(--color-cream-200)", color: "var(--color-slate-800)" }} />
                <button onClick={handleJoin} disabled={busy || joinCode.length !== 6}
                  className="btn-primary w-full">
                  {busy ? "Joining..." : "Join session"}
                </button>
                {error && <p className="text-xs" style={{ color: "var(--color-danger-500)" }}>{error}</p>}
              </div>
            )}
          </div>
        )}

        {step === 1 && (
          <div className="warm-card p-6 space-y-4">
            <h2 className="font-medium" style={{ color: "var(--color-slate-700)" }}>Patient demographics</h2>
            <p className="text-xs" style={{ color: "var(--color-slate-500)" }}>The basics — used to personalize voice messages and pre-fill the doctor dashboard.</p>

            <div>
              <label className="text-xs block mb-1" style={{ color: "var(--color-slate-500)" }}>Patient name *</label>
              <div className="flex gap-2">
                <input value={firstName} onChange={(e) => setFirstName(e.target.value)}
                  placeholder="First name" className="flex-1 px-3 py-2 rounded-lg focus:outline-none"
                  style={{ background: "var(--color-cream-100)", border: "1px solid var(--color-cream-200)" }} />
                <input value={lastName} onChange={(e) => setLastName(e.target.value)}
                  placeholder="Last name" className="flex-1 px-3 py-2 rounded-lg focus:outline-none"
                  style={{ background: "var(--color-cream-100)", border: "1px solid var(--color-cream-200)" }} />
              </div>
            </div>

            <div>
              <label className="text-xs block mb-1" style={{ color: "var(--color-slate-500)" }}>Year of birth *</label>
              <input value={yearOfBirth} onChange={(e) => setYearOfBirth(e.target.value.replace(/\D/g, "").slice(0, 4))}
                placeholder="e.g., 1952" inputMode="numeric" maxLength={4}
                className="w-full px-3 py-2 rounded-lg focus:outline-none"
                style={{ background: "var(--color-cream-100)", border: "1px solid var(--color-cream-200)" }} />
              {!yobValid && yearOfBirth.length > 0 && (
                <p className="text-xs mt-1" style={{ color: "var(--color-danger-500)" }}>Enter a 4-digit year between 1900 and {CURRENT_YEAR}.</p>
              )}
            </div>

            <div>
              <label className="text-xs block mb-1" style={{ color: "var(--color-slate-500)" }}>Gender *</label>
              <div className="flex flex-wrap gap-2">
                {[["female","Female"],["male","Male"],["nonbinary","Non-binary"],["prefer_not","Prefer not to say"]].map(([v, l]) => (
                  <button key={v} onClick={() => setSex(v)}
                    className={`px-3 py-1.5 rounded-full text-sm ${sex === v ? "active" : ""}`}
                    style={{
                      background: sex === v ? "var(--color-teal-500)" : "var(--color-cream-100)",
                      color: sex === v ? "white" : "var(--color-slate-700)",
                      border: "1px solid var(--color-cream-200)",
                    }}>
                    {l}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex justify-between pt-2">
              <button onClick={() => setStep(0)} className="text-sm" style={{ color: "var(--color-slate-500)" }}>Back</button>
              <button onClick={() => setStep(2)}
                disabled={!firstName.trim() || !yobValid || !sex}
                className="btn-primary flex items-center gap-1">
                Next <ArrowRight size={14} />
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="warm-card p-6 space-y-4">
            <h2 className="font-medium" style={{ color: "var(--color-slate-700)" }}>Hospital</h2>
            <p className="text-xs" style={{ color: "var(--color-slate-500)" }}>Where is the patient receiving care?</p>

            <div className="space-y-2">
              {hospitals.map((h) => (
                <button key={h.id} onClick={() => setHospitalId(h.id)}
                  className={`w-full p-3 rounded-lg flex items-start gap-3 text-left transition-all ${hospitalId === h.id ? "ring-2" : ""}`}
                  style={{
                    background: "var(--color-cream-100)",
                    border: "1px solid var(--color-cream-200)",
                    boxShadow: hospitalId === h.id ? "0 0 0 2px var(--color-teal-500)" : "none",
                  }}>
                  <Hospital size={18} style={{ color: "var(--color-teal-600)", marginTop: 2 }} />
                  <div className="flex-1">
                    <p className="font-medium text-sm" style={{ color: "var(--color-slate-800)" }}>{h.name}</p>
                    <p className="text-xs" style={{ color: "var(--color-slate-500)" }}>{h.city}, {h.state}</p>
                    <p className="text-xs mt-1" style={{ color: "var(--color-slate-500)" }}>
                      {(h.departments || []).slice(0, 4).join(" · ")}
                    </p>
                  </div>
                </button>
              ))}
              {hospitals.length === 0 && <p className="text-xs" style={{ color: "var(--color-slate-400)" }}>Loading hospitals...</p>}
            </div>

            <div className="flex justify-between pt-2">
              <button onClick={() => setStep(1)} className="text-sm" style={{ color: "var(--color-slate-500)" }}>Back</button>
              <button onClick={() => setStep(3)} disabled={!hospitalId}
                className="btn-primary flex items-center gap-1">
                Next <ArrowRight size={14} />
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="warm-card p-6 space-y-4">
            <h2 className="font-medium" style={{ color: "var(--color-slate-700)" }}>Assigned doctor</h2>

            <div className="space-y-2">
              {doctors.map((d) => (
                <button key={d.id} onClick={() => setDoctorId(d.id)}
                  className="w-full p-3 rounded-lg flex items-start gap-3 text-left"
                  style={{
                    background: "var(--color-cream-100)",
                    border: "1px solid var(--color-cream-200)",
                    boxShadow: doctorId === d.id ? "0 0 0 2px var(--color-teal-500)" : "none",
                  }}>
                  <Stethoscope size={18} style={{ color: "var(--color-coral-500)", marginTop: 2 }} />
                  <div className="flex-1">
                    <p className="font-medium text-sm" style={{ color: "var(--color-slate-800)" }}>{d.name}</p>
                    <p className="text-xs" style={{ color: "var(--color-slate-500)" }}>{d.specialty}</p>
                    <p className="text-xs mt-1" style={{ color: "var(--color-slate-500)" }}>
                      Speaks: {(d.languages_spoken || []).join(", ")}
                    </p>
                  </div>
                </button>
              ))}
              {doctors.length === 0 && hospitalId && <p className="text-xs" style={{ color: "var(--color-slate-400)" }}>Loading doctors...</p>}
            </div>

            <div className="flex justify-between pt-2">
              <button onClick={() => setStep(2)} className="text-sm" style={{ color: "var(--color-slate-500)" }}>Back</button>
              <button onClick={() => setStep(4)} disabled={!doctorId}
                className="btn-primary flex items-center gap-1">
                Next <ArrowRight size={14} />
              </button>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="warm-card p-6 space-y-4">
            <h2 className="font-medium flex items-center gap-2" style={{ color: "var(--color-slate-700)" }}>
              <Globe size={16} /> Patient's language
            </h2>
            <p className="text-xs" style={{ color: "var(--color-slate-500)" }}>Voice messages and AI responses will be in this language.</p>

            <LanguageSelector selected={language} onSelect={setLanguage} />

            {error && (
              <div className="p-3 rounded-lg text-xs" style={{ background: "var(--color-danger-50)", color: "var(--color-danger-700)" }}>{error}</div>
            )}

            <div className="flex justify-between pt-2">
              <button onClick={() => setStep(3)} className="text-sm" style={{ color: "var(--color-slate-500)" }}>Back</button>
              <button onClick={handleCreate} disabled={!canSubmit || busy}
                className="btn-primary flex items-center gap-1">
                {busy ? "Starting..." : "Start session"} <ArrowRight size={14} />
              </button>
            </div>
            <p className="text-xs text-center" style={{ color: "var(--color-slate-400)" }}>
              Selected: {firstName} {lastName}, born {yearOfBirth}, {sex.replace("_", " ")} · {getLanguageName(language)}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
