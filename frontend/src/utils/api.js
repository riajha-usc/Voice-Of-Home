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

  getLanguages: () => request("/knowledge/languages"),
  searchKnowledge: (q, lang) => request(`/knowledge/search?q=${encodeURIComponent(q)}&lang=${lang || ""}`),

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

  chat: (message, sessionId, languageCode, patientContext, chatHistory) =>
    request("/chat", {
      method: "POST",
      body: { message, session_id: sessionId, language_code: languageCode, patient_context: patientContext, chat_history: chatHistory },
    }),

  uploadFood: (imageBase64) =>
    request("/upload/food", {
      method: "POST",
      body: { image_base64: imageBase64 },
    }),

  createSession: (patientContext, careCircle) =>
    request("/sessions", {
      method: "POST",
      body: { patient_context: patientContext, care_circle: careCircle },
    }),
};
