const express = require("express");
const { v4: uuidv4 } = require("uuid");
const { analyzeSymptoms, analyzeFood, simplifyCareInstructions } = require("../services/gemini-service");
const { generateVoice, checkQuota } = require("../services/elevenlabs-service");
const { chat } = require("../services/claude-service");
const { searchKnowledgeBase, getByLanguage, getLanguages, vectorSearch } = require("../services/knowledge-base");
const { uploadFoodPhoto } = require("../services/cloudinary-service");
const hospitals = require("../services/hospital-service");
const patients = require("../services/patient-service");
const sessions = require("../services/session-service");
const feedback = require("../services/feedback-service");
const mentalHealth = require("../services/mental-health-service");

const router = express.Router();

// -------------------------------------------------------------------------
// Health
// -------------------------------------------------------------------------
router.get("/health", (req, res) => {
  res.json({
    status: "ok",
    project: "Voices of Home",
    hackathon: "LA Hacks 2026",
    tracks: ["Catalyst for Care", "Agentverse"],
    challenges: ["Fetch.ai", "Cloudinary", "Gemini", "ElevenLabs", "Zetic", "GoDaddy", "MongoDB Atlas"],
    apis: {
      gemini: !!process.env.GOOGLE_API_KEY && process.env.GOOGLE_API_KEY !== "your_gemini_api_key",
      chat_asi_one: !!process.env.ASI_ONE_API_KEY && process.env.ASI_ONE_API_KEY !== "your_asi_one_key",
      elevenlabs: !!process.env.ELEVENLABS_API_KEY && process.env.ELEVENLABS_API_KEY !== "your_elevenlabs_api_key",
      cloudinary: !!process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_KEY !== "your_api_key",
      mongodb: !!process.env.MONGODB_URI && !process.env.MONGODB_URI.includes("username:password"),
    },
  });
});

// -------------------------------------------------------------------------
// Knowledge base
// -------------------------------------------------------------------------
router.get("/knowledge/languages", (req, res) => {
  res.json({ languages: getLanguages() });
});

router.get("/knowledge/search", async (req, res) => {
  const { q, lang, limit, mode } = req.query;
  if (!q) return res.status(400).json({ error: "Query parameter 'q' is required." });

  // mode=vector forces Atlas Vector Search; mode=text forces in-memory.
  // Default: try vector, fall back to in-memory if Atlas/embeddings unavailable.
  const wantVector = mode !== "text";
  let results = null;
  let method = "in_memory";

  if (wantVector) {
    try {
      const vr = await vectorSearch(q, lang || null, parseInt(limit) || 5);
      if (vr && vr.length > 0) { results = vr; method = "atlas_vector_search"; }
    } catch (err) {
      console.warn("[KnowledgeBase] vectorSearch failed, falling back:", err.message);
    }
  }

  if (!results) results = searchKnowledgeBase(q, lang || null, parseInt(limit) || 5);

  res.json({ query: q, language: lang || "all", method, results });
});

router.get("/knowledge/:languageCode", (req, res) => {
  const entries = getByLanguage(req.params.languageCode);
  res.json({ language_code: req.params.languageCode, count: entries.length, entries });
});

// -------------------------------------------------------------------------
// Hospitals & doctors
// -------------------------------------------------------------------------
router.get("/hospitals", async (req, res) => {
  res.json({ hospitals: await hospitals.listHospitals() });
});

router.get("/hospitals/:id", async (req, res) => {
  const h = await hospitals.getHospital(req.params.id);
  if (!h) return res.status(404).json({ error: "Hospital not found" });
  res.json(h);
});

router.get("/doctors", async (req, res) => {
  res.json({ doctors: await hospitals.listDoctors(req.query.hospital_id || null) });
});

router.get("/doctors/:id", async (req, res) => {
  const d = await hospitals.getDoctor(req.params.id);
  if (!d) return res.status(404).json({ error: "Doctor not found" });
  res.json(d);
});

// -------------------------------------------------------------------------
// Patients
// -------------------------------------------------------------------------
router.post("/patients", async (req, res) => {
  const { first_name, last_name, year_of_birth, sex, language_code, language_name, hospital_id, assigned_doctor_id, room, conditions, medications, allergies } = req.body;
  if (!first_name || !year_of_birth) {
    return res.status(400).json({ error: "Fields 'first_name' and 'year_of_birth' are required." });
  }
  try {
    const yob = parseInt(year_of_birth);
    const dob = `${yob}-01-01`; // year-only fidelity
    const patient = await patients.createPatient({
      first_name, last_name: last_name || "",
      dob, year_of_birth: yob,
      sex: sex || null,
      language_code, language_name,
      hospital_id, assigned_doctor_id, room,
      conditions, medications, allergies,
    });
    res.json(patient);
  } catch (err) {
    console.error("[API] Create patient failed:", err);
    res.status(500).json({ error: "Could not create patient", details: err.message });
  }
});

router.get("/patients/:id", async (req, res) => {
  const p = await patients.getPatient(req.params.id);
  if (!p) return res.status(404).json({ error: "Patient not found" });
  res.json(p);
});

// -------------------------------------------------------------------------
// Sessions — the persistence layer for the whole patient/family/doctor flow
// -------------------------------------------------------------------------
router.post("/sessions", async (req, res) => {
  try {
    const sid = req.body.session_id || ("s_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6));
    const session = await sessions.createSession(sid, {
      patient_id: req.body.patient_id || null,
      hospital_id: req.body.hospital_id || null,
      assigned_doctor_id: req.body.assigned_doctor_id || null,
      language_code: req.body.language_code || null,
      language_name: req.body.language_name || null,
      care_circle: req.body.care_circle || [],
    });
    res.json(session);
  } catch (err) {
    console.error("[API] Create session failed:", err);
    res.status(500).json({ error: "Could not create session", details: err.message });
  }
});

router.get("/sessions/:id", async (req, res) => {
  const s = await sessions.getSession(req.params.id);
  if (!s) return res.status(404).json({ error: "Session not found" });
  res.json(s);
});

router.post("/sessions/join", async (req, res) => {
  const { join_code } = req.body;
  if (!join_code) return res.status(400).json({ error: "Field 'join_code' is required." });
  const s = await sessions.getSessionByJoinCode(join_code);
  if (!s) return res.status(404).json({ error: "Invalid or expired join code" });
  res.json(s);
});

router.post("/sessions/:id/care-circle", async (req, res) => {
  const { name, relationship, phone, email, language_code } = req.body;
  if (!name || !relationship) {
    return res.status(400).json({ error: "Fields 'name' and 'relationship' are required." });
  }
  const member = {
    id: "cc_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 5),
    name,
    relationship,
    phone: phone || null,
    email: email || null,
    language_code: language_code || null,
    initials: name.split(/\s+/).map((w) => w[0]).slice(0, 2).join("").toUpperCase(),
    messagesHeard: 0,
    messagesTotal: 0,
    joined_at: new Date().toISOString(),
  };
  const updated = await sessions.appendToArray(req.params.id, "care_circle", member);
  res.json({ member, session: updated });
});

router.delete("/sessions/:id/care-circle/:memberId", async (req, res) => {
  const updated = await sessions.removeFromArray(req.params.id, "care_circle", "id", req.params.memberId);
  res.json({ session: updated });
});

// -------------------------------------------------------------------------
// Symptoms — analyze AND persist to session
// -------------------------------------------------------------------------
router.post("/symptoms/analyze", async (req, res) => {
  const { text, language_code, session_id } = req.body;
  if (!text || !language_code) {
    return res.status(400).json({ error: "Fields 'text' and 'language_code' are required." });
  }
  const sid = session_id || uuidv4();

  try {
    const result = await analyzeSymptoms(text, language_code);
    const stamped = { id: "ins_" + Date.now().toString(36), ...result, raw_text: text, timestamp: new Date().toISOString() };
    if (session_id) {
      await sessions.appendToArray(sid, "symptom_insights", stamped, { language_code });
    }
    res.json({ session_id: sid, ...stamped });
  } catch (err) {
    console.error("[API] Symptom analysis error:", err);
    res.status(500).json({ error: "Symptom analysis failed.", details: err.message });
  }
});

// -------------------------------------------------------------------------
// Dietary — analyze AND persist to session
// -------------------------------------------------------------------------
router.post("/dietary/analyze", async (req, res) => {
  const { image_url, language_code, session_id, dietary_restrictions } = req.body;
  if (!image_url || !language_code) {
    return res.status(400).json({ error: "Fields 'image_url' and 'language_code' are required." });
  }
  const sid = session_id || uuidv4();

  try {
    const result = await analyzeFood(image_url, language_code, dietary_restrictions || []);
    const stamped = { id: "diet_" + Date.now().toString(36), ...result, image_url, timestamp: new Date().toISOString() };
    if (session_id) {
      await sessions.appendToArray(sid, "dietary_results", stamped, { language_code });
    }
    res.json({ session_id: sid, ...stamped });
  } catch (err) {
    console.error("[API] Dietary analysis error:", err);
    res.status(500).json({ error: "Dietary analysis failed.", details: err.message });
  }
});

// -------------------------------------------------------------------------
// Voice — generate AND persist to session
// -------------------------------------------------------------------------
router.post("/voice/generate", async (req, res) => {
  const { text, target_language_code, session_id, message_type } = req.body;
  if (!text || !target_language_code) {
    return res.status(400).json({ error: "Fields 'text' and 'target_language_code' are required." });
  }
  const sid = session_id || uuidv4();

  try {
    const simplified = await simplifyCareInstructions(text, target_language_code);
    const textForVoice = simplified.translated || simplified.simplified_english || text;
    const voiceResult = await generateVoice(textForVoice, target_language_code);

    const payload = {
      id: "voice_" + Date.now().toString(36),
      audio_base64: voiceResult.audio ? voiceResult.audio.toString("base64") : null,
      duration_seconds: voiceResult.duration_seconds,
      simplified_text: simplified,
      message_type: message_type || "custom",
      typeLabel: message_type || "Care message",
      original_text: text,
      language: target_language_code,
      method: voiceResult.method,
      message: voiceResult.message || voiceResult.error,
      timestamp: new Date().toISOString(),
    };

    if (session_id) {
      // Don't store the giant base64 in the session record — only metadata.
      const { audio_base64, ...meta } = payload;
      await sessions.appendToArray(sid, "voice_messages", meta, { language_code: target_language_code });
    }

    res.json({ session_id: sid, ...payload });
  } catch (err) {
    console.error("[API] Voice generation error:", err);
    res.status(500).json({ error: "Voice generation failed.", details: err.message });
  }
});

router.get("/voice/quota", async (req, res) => {
  res.json(await checkQuota());
});

// -------------------------------------------------------------------------
// Chat (care assistant) — uses ASI:One asi1-ultra by default, Anthropic fallback
// -------------------------------------------------------------------------
router.post("/chat", async (req, res) => {
  const { message, session_id, language_code, patient_context, chat_history, surface } = req.body;
  if (!message) return res.status(400).json({ error: "Field 'message' is required." });
  const sid = session_id || uuidv4();

  try {
    const result = await chat(message, patient_context || {}, chat_history || [], language_code || null, surface || "care");
    const turn = {
      id: "msg_" + Date.now().toString(36),
      user_message: message,
      assistant_message: result.response || result.message,
      surface: surface || "care",
      timestamp: new Date().toISOString(),
    };
    if (session_id) {
      await sessions.appendToArray(sid, "chat_history", turn, { language_code });
    }
    res.json({ session_id: sid, ...result, timestamp: turn.timestamp });
  } catch (err) {
    console.error("[API] Chat error:", err);
    res.status(500).json({ error: "Chat failed.", details: err.message });
  }
});

// -------------------------------------------------------------------------
// Doctor feedback — approve/modify/reject any AI output
// -------------------------------------------------------------------------
router.post("/feedback", async (req, res) => {
  const { session_id, target_type, target_id, doctor_id, verdict, notes } = req.body;
  if (!target_type || !target_id || !verdict) {
    return res.status(400).json({ error: "Fields 'target_type', 'target_id', 'verdict' are required." });
  }
  if (!["approved", "modified", "rejected"].includes(verdict)) {
    return res.status(400).json({ error: "verdict must be approved | modified | rejected" });
  }
  try {
    const fb = await feedback.recordFeedback({
      session_id: session_id || null,
      target_type, target_id,
      doctor_id: doctor_id || null,
      verdict, notes: notes || null,
    });
    res.json(fb);
  } catch (err) {
    res.status(500).json({ error: "Feedback failed.", details: err.message });
  }
});

router.get("/feedback/session/:id", async (req, res) => {
  res.json({ feedback: await feedback.listForSession(req.params.id) });
});

router.get("/feedback/stats", async (req, res) => {
  res.json(await feedback.summary());
});

// -------------------------------------------------------------------------
// Mental health — pattern lookup over the 600-person dataset + chat surface
// -------------------------------------------------------------------------
router.post("/mental-health/match", async (req, res) => {
  const { text, top_k } = req.body;
  if (!text) return res.status(400).json({ error: "Field 'text' is required." });
  try {
    res.json({ matches: await mentalHealth.matchPattern(text, parseInt(top_k) || 3) });
  } catch (err) {
    res.status(500).json({ error: "Pattern matching failed.", details: err.message });
  }
});

router.get("/mental-health/personas", (req, res) => {
  res.json({ personas: mentalHealth.getPersonas() });
});

router.get("/mental-health/stats", (req, res) => {
  res.json(mentalHealth.datasetStats());
});

// Submit a mental health check-in (mood ratings, triggers, journal, recommendations feedback)
router.post("/mental-health/checkin", async (req, res) => {
  const { session_id, feelings, triggers, journal_text, intensity, trigger_categories, recommendations_feedback } = req.body;
  if (!session_id) return res.status(400).json({ error: "session_id is required." });

  const checkin = {
    id: uuidv4(),
    timestamp: new Date().toISOString(),
    feelings: feelings || {},              // { anxiety: 30, stress: 40, energy: 60, ... }
    triggers: triggers || null,            // free text
    trigger_categories: trigger_categories || [],  // ["Work", "Family", ...]
    intensity: intensity ?? null,          // 0-10
    journal_text: journal_text || null,
    recommendations_feedback: recommendations_feedback || null,  // "helpful" | "need_more"
  };

  try {
    const updated = await sessions.appendToArray(session_id, "mental_health_checkins", checkin);
    res.json({ checkin, session: updated });
  } catch (err) {
    res.status(500).json({ error: "Failed to save check-in.", details: err.message });
  }
});

// -------------------------------------------------------------------------
// Image upload
// -------------------------------------------------------------------------
router.post("/upload/food", async (req, res) => {
  const { image_base64 } = req.body;
  if (!image_base64) return res.status(400).json({ error: "Field 'image_base64' is required." });
  try {
    res.json(await uploadFoodPhoto(image_base64));
  } catch (err) {
    res.status(500).json({ error: "Upload failed.", details: err.message });
  }
});

module.exports = router;
