import { useState, useEffect, createContext, useContext, useCallback } from "react";
import { api } from "../utils/api";

const SessionContext = createContext(null);

const LANG_NAMES = {
  vi: "Vietnamese", es: "Spanish", ht: "Haitian Creole", hi: "Hindi",
  zh: "Mandarin", tl: "Tagalog", ko: "Korean", ar: "Arabic", fa: "Farsi", en: "English",
};

const STORAGE_KEY = "voh.session_id";

function loadStoredSessionId() {
  try { return localStorage.getItem(STORAGE_KEY); } catch { return null; }
}
function storeSessionId(id) {
  try { id ? localStorage.setItem(STORAGE_KEY, id) : localStorage.removeItem(STORAGE_KEY); } catch {}
}

export function SessionProvider({ children }) {
  // Local-only UI state we keep client-side
  const [language, setLanguage] = useState("en");
  const [patientId, setPatientId] = useState(null);
  const [hospital, setHospital] = useState(null);
  const [doctor, setDoctor] = useState(null);
  const [patient, setPatient] = useState(null);
  // Backend-backed session record
  const [sessionId, setSessionId] = useState(loadStoredSessionId());
  const [sessionRecord, setSessionRecord] = useState(null);
  const [isHydrating, setIsHydrating] = useState(false);
  const [onboarded, setOnboarded] = useState(false);

  const refreshSession = useCallback(async () => {
    if (!sessionId) return null;
    try {
      const s = await api.getSession(sessionId);
      setSessionRecord(s);
      if (s.language_code) setLanguage(s.language_code);
      if (s.patient_id) setPatientId(s.patient_id);
      return s;
    } catch (err) {
      console.warn("[Session] refresh failed:", err.message);
      return null;
    }
  }, [sessionId]);

  // Hydrate the session record + patient/doctor/hospital details on mount
  useEffect(() => {
    let cancelled = false;
    async function hydrate() {
      if (!sessionId) return;
      setIsHydrating(true);
      try {
        const s = await api.getSession(sessionId);
        if (cancelled) return;
        setSessionRecord(s);
        if (s.language_code) setLanguage(s.language_code);
        if (s.patient_id) {
          setPatientId(s.patient_id);
          try {
            const p = await api.getPatient(s.patient_id);
            if (!cancelled) setPatient(p);
          } catch {}
        }
        if (s.hospital_id) {
          try {
            const h = await api.getHospital(s.hospital_id);
            if (!cancelled) setHospital(h);
          } catch {}
        }
        if (s.assigned_doctor_id) {
          try {
            const d = await api.getDoctor(s.assigned_doctor_id);
            if (!cancelled) setDoctor(d);
          } catch {}
        }
        setOnboarded(!!s.patient_id);
      } catch (err) {
        // Stale local sessionId — wipe
        console.warn("[Session] could not hydrate, clearing local id:", err.message);
        storeSessionId(null);
        setSessionId(null);
      } finally {
        if (!cancelled) setIsHydrating(false);
      }
    }
    hydrate();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---------------------------------------------------------------------------
  // Onboarding flow: create patient + session
  // ---------------------------------------------------------------------------
  const completeOnboarding = useCallback(async ({ first_name, last_name, year_of_birth, sex, language_code, hospital_id, assigned_doctor_id }) => {
    const langName = LANG_NAMES[language_code] || language_code;
    const p = await api.createPatient({
      first_name,
      last_name: last_name || "",
      year_of_birth,
      sex,
      language_code,
      language_name: langName,
      hospital_id,
      assigned_doctor_id,
    });
    setPatient(p);
    setPatientId(p.id);

    const newSid = "s_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    const session = await api.createSession({
      session_id: newSid,
      patient_id: p.id,
      hospital_id,
      assigned_doctor_id,
      language_code,
      language_name: langName,
    });
    setSessionId(session.session_id);
    setSessionRecord(session);
    setLanguage(language_code);
    storeSessionId(session.session_id);

    if (hospital_id) {
      try { setHospital(await api.getHospital(hospital_id)); } catch {}
    }
    if (assigned_doctor_id) {
      try { setDoctor(await api.getDoctor(assigned_doctor_id)); } catch {}
    }
    setOnboarded(true);
    return session;
  }, []);

  // ---------------------------------------------------------------------------
  // Join an existing session by 6-digit code (phone ↔ tablet handoff)
  // ---------------------------------------------------------------------------
  const joinByCode = useCallback(async (code) => {
    const s = await api.joinSession(code);
    setSessionId(s.session_id);
    setSessionRecord(s);
    if (s.language_code) setLanguage(s.language_code);
    if (s.patient_id) {
      setPatientId(s.patient_id);
      try { setPatient(await api.getPatient(s.patient_id)); } catch {}
    }
    if (s.hospital_id) {
      try { setHospital(await api.getHospital(s.hospital_id)); } catch {}
    }
    if (s.assigned_doctor_id) {
      try { setDoctor(await api.getDoctor(s.assigned_doctor_id)); } catch {}
    }
    storeSessionId(s.session_id);
    setOnboarded(true);
    return s;
  }, []);

  // ---------------------------------------------------------------------------
  // Sign out (clear local session)
  // ---------------------------------------------------------------------------
  const reset = useCallback(() => {
    storeSessionId(null);
    setSessionId(null);
    setSessionRecord(null);
    setPatient(null);
    setPatientId(null);
    setHospital(null);
    setDoctor(null);
    setOnboarded(false);
  }, []);

  // ---------------------------------------------------------------------------
  // Mutations — these all write to the backend, then refresh the record once
  // so the current tab picks up the saved result immediately.
  // ---------------------------------------------------------------------------
  const updateLanguage = (code) => {
    setLanguage(code);
    // Backend update is implicit on the next analyze/diet/voice/chat call.
  };

  const addCareCircleMember = useCallback(async (member) => {
    if (!sessionId) throw new Error("No session");
    await api.addCareCircleMember(sessionId, member);
    return refreshSession();
  }, [sessionId, refreshSession]);

  const removeCareCircleMember = useCallback(async (memberId) => {
    if (!sessionId) throw new Error("No session");
    await api.removeCareCircleMember(sessionId, memberId);
    return refreshSession();
  }, [sessionId, refreshSession]);

  // After analyze/diet/voice/chat returns, the backend has already persisted
  // it to the session — we just refresh.
  const onAnalyzed = useCallback(() => { refreshSession(); }, [refreshSession]);

  // ---------------------------------------------------------------------------
  // Compose the snapshot the UI consumes (mirrors the old shape so existing
  // pages keep working).
  // ---------------------------------------------------------------------------
  const session = {
    sessionId: sessionId || "",
    joinCode: sessionRecord?.join_code || "",
    language,
    patientId,
    patient,
    hospital,
    doctor,
    patientContext: {
      language: patient?.language_name || LANG_NAMES[language] || language,
      conditions: patient?.conditions || [],
      medications: patient?.medications || [],
      dietary_restrictions: patient?.dietary_restrictions || [],
    },
    careCircle: sessionRecord?.care_circle || [],
    symptomInsights: sessionRecord?.symptom_insights || [],
    dietaryResults: sessionRecord?.dietary_results || [],
    voiceMessages: sessionRecord?.voice_messages || [],
    chatHistory: sessionRecord?.chat_history || [],
    mentalHealthCheckins: sessionRecord?.mental_health_checkins || [],
    mentalHealthAppointments: sessionRecord?.mental_health_appointments || [],
    onboarded,
    isHydrating,
  };

  return (
    <SessionContext.Provider value={{
      session,
      updateLanguage,
      completeOnboarding,
      joinByCode,
      addCareCircleMember,
      removeCareCircleMember,
      refreshSession,
      onAnalyzed,
      reset,
    }}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession must be used within SessionProvider");
  return ctx;
}
