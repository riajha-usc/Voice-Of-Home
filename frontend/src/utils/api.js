const API_BASE = "/api";

async function request(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;
  const config = {
    headers: { "Content-Type": "application/json" },
    ...options,
  };
  if (config.body && typeof config.body === "object") {
    config.body = JSON.stringify(config.body);
  }
  const res = await fetch(url, config);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || err.details || "Request failed");
  }
  return res.json();
}

export const api = {
  health: () => request("/health"),

  // Knowledge base (vector search by default, falls back to in-memory)
  getLanguages: () => request("/knowledge/languages"),
  searchKnowledge: (q, lang, mode) =>
    request(`/knowledge/search?q=${encodeURIComponent(q)}&lang=${lang || ""}${mode ? "&mode=" + mode : ""}`),

  // Hospitals & doctors
  listHospitals: () => request("/hospitals"),
  getHospital: (id) => request(`/hospitals/${id}`),
  listDoctors: (hospitalId) => request(`/doctors${hospitalId ? `?hospital_id=${hospitalId}` : ""}`),
  getDoctor: (id) => request(`/doctors/${id}`),

  // Patients
  listPatients: (doctorId, hospitalId) =>
    request(`/patients?${doctorId ? `doctor_id=${doctorId}` : `hospital_id=${hospitalId}`}`),
  createPatient: (data) => request("/patients", { method: "POST", body: data }),
  getPatient: (id) => request(`/patients/${id}`),

  // Sessions (the persistence layer)
  listSessions: (doctorId, hospitalId, limit) =>
    request(`/sessions?${doctorId ? `doctor_id=${doctorId}` : `hospital_id=${hospitalId}`}${limit ? `&limit=${limit}` : ""}`),
  createSession: (data) => request("/sessions", { method: "POST", body: data }),
  getSession: (id) => request(`/sessions/${id}`),
  joinSession: (joinCode) => request("/sessions/join", { method: "POST", body: { join_code: joinCode } }),
  addCareCircleMember: (sessionId, member) =>
    request(`/sessions/${sessionId}/care-circle`, { method: "POST", body: member }),
  removeCareCircleMember: (sessionId, memberId) =>
    request(`/sessions/${sessionId}/care-circle/${memberId}`, { method: "DELETE" }),

  // Symptoms / diet / voice (now persist to session if session_id passed)
  analyzeSymptoms: (text, languageCode, sessionId) =>
    request("/symptoms/analyze", {
      method: "POST",
      body: { text, language_code: languageCode, session_id: sessionId },
    }),
  analyzeDiet: (imageUrl, languageCode, sessionId, restrictions) =>
    request("/dietary/analyze", {
      method: "POST",
      body: { image_url: imageUrl, language_code: languageCode, session_id: sessionId, dietary_restrictions: restrictions },
    }),
  generateVoice: (text, targetLang, sessionId, messageType) =>
    request("/voice/generate", {
      method: "POST",
      body: { text, target_language_code: targetLang, session_id: sessionId, message_type: messageType },
    }),
  voiceQuota: () => request("/voice/quota"),

  // Chat — surface defaults to "care", can be "mental_health"
  chat: (message, sessionId, languageCode, patientContext, chatHistory, surface) =>
    request("/chat", {
      method: "POST",
      body: { message, session_id: sessionId, language_code: languageCode, patient_context: patientContext, chat_history: chatHistory, surface: surface || "care" },
    }),

  uploadFood: (imageBase64) =>
    request("/upload/food", {
      method: "POST",
      body: { image_base64: imageBase64 },
    }),

  // Doctor feedback
  recordFeedback: (data) => request("/feedback", { method: "POST", body: data }),
  feedbackForSession: (sessionId) => request(`/feedback/session/${sessionId}`),
  feedbackStats: () => request("/feedback/stats"),

  // Mental health
  matchMentalHealthPattern: (text, topK) =>
    request("/mental-health/match", { method: "POST", body: { text, top_k: topK || 3 } }),
  getMentalHealthPersonas: () => request("/mental-health/personas"),
  getMentalHealthStats: () => request("/mental-health/stats"),

  submitMentalHealthCheckin: (data) =>
    request("/mental-health/checkin", { method: "POST", body: data }),
  requestMentalHealthAppointment: (data) =>
    request("/mental-health/appointments", { method: "POST", body: data }),
};
