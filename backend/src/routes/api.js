const express = require("express");
const { v4: uuidv4 } = require("uuid");
const { analyzeSymptoms, analyzeFood, simplifyCareInstructions } = require("../services/gemini-service");
const { generateVoice, checkQuota } = require("../services/elevenlabs-service");
const { chat } = require("../services/claude-service");
const { searchKnowledgeBase, getByLanguage, getLanguages } = require("../services/knowledge-base");
const { uploadFoodPhoto } = require("../services/cloudinary-service");

const router = express.Router();

router.get("/health", (req, res) => {
  res.json({
    status: "ok",
    project: "Voices of Home",
    hackathon: "LA Hacks 2026",
    tracks: ["Catalyst for Care", "Agentverse"],
    challenges: ["Fetch.ai", "Cloudinary", "Gemini", "ElevenLabs", "Zetic", "GoDaddy"],
    apis: {
      gemini: !!process.env.GOOGLE_API_KEY && process.env.GOOGLE_API_KEY !== "your_gemini_api_key",
      claude: !!process.env.ANTHROPIC_API_KEY && process.env.ANTHROPIC_API_KEY !== "your_anthropic_api_key",
      elevenlabs: !!process.env.ELEVENLABS_API_KEY && process.env.ELEVENLABS_API_KEY !== "your_elevenlabs_api_key",
      cloudinary: !!process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_KEY !== "your_api_key",
      mongodb: !!process.env.MONGODB_URI && process.env.MONGODB_URI !== "mongodb+srv://username:password@cluster.mongodb.net/voicesofhome?retryWrites=true&w=majority",
    },
  });
});

router.get("/knowledge/languages", (req, res) => {
  const languages = getLanguages();
  res.json({ languages });
});

router.get("/knowledge/search", (req, res) => {
  const { q, lang, limit } = req.query;
  if (!q) return res.status(400).json({ error: "Query parameter 'q' is required." });

  const results = searchKnowledgeBase(q, lang || null, parseInt(limit) || 5);
  res.json({ query: q, language: lang || "all", results });
});

router.get("/knowledge/:languageCode", (req, res) => {
  const entries = getByLanguage(req.params.languageCode);
  res.json({ language_code: req.params.languageCode, count: entries.length, entries });
});

router.post("/symptoms/analyze", async (req, res) => {
  const { text, language_code, session_id } = req.body;

  if (!text || !language_code) {
    return res.status(400).json({ error: "Fields 'text' and 'language_code' are required." });
  }

  const sid = session_id || uuidv4();

  try {
    const result = await analyzeSymptoms(text, language_code);
    res.json({
      session_id: sid,
      ...result,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error("[API] Symptom analysis error:", err);
    res.status(500).json({ error: "Symptom analysis failed.", details: err.message });
  }
});

router.post("/dietary/analyze", async (req, res) => {
  const { image_url, language_code, session_id, dietary_restrictions } = req.body;

  if (!image_url || !language_code) {
    return res.status(400).json({ error: "Fields 'image_url' and 'language_code' are required." });
  }

  const sid = session_id || uuidv4();

  try {
    const result = await analyzeFood(image_url, language_code, dietary_restrictions || []);
    res.json({
      session_id: sid,
      ...result,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error("[API] Dietary analysis error:", err);
    res.status(500).json({ error: "Dietary analysis failed.", details: err.message });
  }
});

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

    if (voiceResult.audio) {
      res.json({
        session_id: sid,
        audio_base64: voiceResult.audio.toString("base64"),
        duration_seconds: voiceResult.duration_seconds,
        simplified_text: simplified,
        message_type: message_type || "custom",
        language: target_language_code,
        method: voiceResult.method,
        timestamp: new Date().toISOString(),
      });
    } else {
      res.json({
        session_id: sid,
        audio_base64: null,
        duration_seconds: voiceResult.duration_seconds,
        simplified_text: simplified,
        message_type: message_type || "custom",
        language: target_language_code,
        method: voiceResult.method,
        message: voiceResult.message || voiceResult.error,
        timestamp: new Date().toISOString(),
      });
    }
  } catch (err) {
    console.error("[API] Voice generation error:", err);
    res.status(500).json({ error: "Voice generation failed.", details: err.message });
  }
});

router.get("/voice/quota", async (req, res) => {
  const quota = await checkQuota();
  res.json(quota);
});

router.post("/chat", async (req, res) => {
  const { message, session_id, language_code, patient_context, chat_history } = req.body;

  if (!message) {
    return res.status(400).json({ error: "Field 'message' is required." });
  }

  const sid = session_id || uuidv4();

  try {
    const result = await chat(message, patient_context || {}, chat_history || [], language_code || null);
    res.json({
      session_id: sid,
      ...result,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error("[API] Chat error:", err);
    res.status(500).json({ error: "Chat failed.", details: err.message });
  }
});

router.post("/upload/food", async (req, res) => {
  const { image_base64 } = req.body;
  if (!image_base64) return res.status(400).json({ error: "Field 'image_base64' is required." });
  try {
    const result = await uploadFoodPhoto(image_base64);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: "Upload failed.", details: err.message });
  }
});

router.post("/sessions", (req, res) => {
  const session = {
    session_id: uuidv4(),
    patient_context: req.body.patient_context || {},
    care_circle: req.body.care_circle || [],
    created_at: new Date().toISOString(),
  };
  res.json(session);
});

module.exports = router;
