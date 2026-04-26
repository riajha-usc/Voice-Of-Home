/**
 * gemini-service.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Model routing
 *   • Symptom analysis (text RAG)   → gemma-4-31b-it        (PRIMARY_MODEL)
 *   • Food image analysis           → gemini-2.5-flash      (VISION_MODEL)
 *   • Care instruction translation  → gemini-2.5-flash      (VISION_MODEL)
 *     ↑ gemini-2.5-flash has superior multilingual output quality and handles
 *       the translation + simplification step in one pass, which is exactly
 *       what the DietPage UI needs.
 * ─────────────────────────────────────────────────────────────────────────────
 */

"use strict";

const { searchKnowledgeBase } = require("./knowledge-base");

// ── Model names ───────────────────────────────────────────────────────────────
const PRIMARY_MODEL = "gemma-4-31b-it";          // symptom text RAG
const VISION_MODEL  = "gemini-2.5-flash";        // food vision + translation

// ── Shared SDK state ──────────────────────────────────────────────────────────
let genAI       = null;   // GoogleGenerativeAI instance
let textModel   = null;   // PRIMARY_MODEL  — symptom analysis
let visionModel = null;   // VISION_MODEL   — food + translation

// ── JSON helpers ──────────────────────────────────────────────────────────────
function normalizeJsonCandidate(text) {
  return String(text || "")
    .replace(/```json\s*/gi, "")
    .replace(/```/g, "")
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .trim();
}

function extractBalancedJson(text) {
  const input = normalizeJsonCandidate(text);
  const start = input.search(/[\[{]/);
  if (start === -1) throw new Error(`No JSON found in model response: ${input.slice(0, 120)}`);

  const opening = input[start];
  const closing = opening === "{" ? "}" : "]";
  let depth = 0, inString = false, escaped = false;

  for (let i = start; i < input.length; i++) {
    const ch = input[i];
    if (escaped)       { escaped = false; continue; }
    if (ch === "\\")   { escaped = true;  continue; }
    if (ch === '"')    { inString = !inString; continue; }
    if (inString)      continue;
    if (ch === opening) depth++;
    if (ch === closing) depth--;
    if (depth === 0)   return input.slice(start, i + 1);
  }
  throw new Error(`Incomplete JSON in model response: ${input.slice(0, 120)}`);
}

function parseModelJson(text) {
  return JSON.parse(extractBalancedJson(text));
}

// ── Init ──────────────────────────────────────────────────────────────────────
function initGemini() {
  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey || apiKey === "your_gemini_api_key") {
    console.warn("[Gemini] GOOGLE_API_KEY not set — using mock responses.");
    return false;
  }

  const { GoogleGenerativeAI } = require("@google/generative-ai");
  genAI = new GoogleGenerativeAI(apiKey);

  // Text model for symptom RAG
  textModel = genAI.getGenerativeModel({ model: PRIMARY_MODEL });

  // Vision model for food analysis AND care-instruction translation
  visionModel = genAI.getGenerativeModel({
    model: VISION_MODEL,
    // gemini-2.5-flash supports a thinking budget; 0 keeps latency low for
    // structured JSON tasks. Remove this block if you want full chain-of-thought.
    generationConfig: {
      temperature: 0.2,      // low temp → deterministic JSON
      topP: 0.8,
      maxOutputTokens: 4096,
    },
  });

  console.log(`[Gemini] Text model  : ${PRIMARY_MODEL}`);
  console.log(`[Gemini] Vision model: ${VISION_MODEL} (food analysis + translation)`);
  return true;
}

// ────────────────────────────────────────────────────────────────────────────
// analyzeSymptoms  — unchanged, uses textModel (gemma-4-31b-it)
// ────────────────────────────────────────────────────────────────────────────
async function analyzeSymptoms(text, languageCode) {
  const kbResults = searchKnowledgeBase(text, languageCode, 3);

  const kbContext = kbResults.length > 0
    ? kbResults.map(e =>
        `- Expression: "${e.cultural_expression}" (${e.language})\n` +
        `  Literal: "${e.literal_translation}"\n` +
        `  Clinical: ${e.clinical_mapping}\n` +
        `  ICD-10: ${e.icd10_codes.join(", ")}\n` +
        `  Screenings: ${e.recommended_screenings.join(", ")}\n` +
        `  Source: ${e.source_citation}`
      ).join("\n\n")
    : "No exact matches found. Analyze based on general cultural-medical knowledge.";

  // Fallback when API key not set
  if (!textModel) {
    return {
      insights: kbResults.map(e => ({
        cultural_expression: e.cultural_expression,
        literal_translation: e.literal_translation,
        clinical_mapping: e.clinical_mapping,
        icd10_codes: e.icd10_codes,
        recommended_screenings: e.recommended_screenings,
        confidence: e.confidence_level,
        source: e.source_citation,
        body_system: e.body_system,
        alert_level: e.body_system?.includes("cardiovascular") ? "critical" : "warning",
      })),
      raw_text: text,
      language_code: languageCode,
      method: "knowledge_base_only",
    };
  }

  const prompt = `You are a clinical cultural intelligence system. A patient who speaks ${languageCode} has described symptoms using cultural language.

PATIENT INPUT: "${text}"

CULTURAL KNOWLEDGE BASE MATCHES:
${kbContext}

Return a JSON response:
{
  "insights": [
    {
      "cultural_expression": "exact cultural phrase",
      "literal_translation": "word-for-word English translation",
      "clinical_mapping": "clinical meaning in 1-2 sentences",
      "icd10_codes": ["ICD-10 codes"],
      "recommended_screenings": ["specific tests"],
      "confidence": "high|medium|low",
      "body_system": "affected body system",
      "alert_level": "critical|warning|info"
    }
  ]
}

RULES:
- Prioritize knowledge base matches.
- Mark cardiovascular / neurologic emergencies as "critical".
- Return ONLY valid JSON. No markdown, no explanation outside the JSON.`;

  try {
    const result = await textModel.generateContent(prompt);
    const parsed = parseModelJson(result.response.text());
    return { ...parsed, raw_text: text, language_code: languageCode, method: "gemini_rag" };
  } catch (err) {
    console.error("[Gemini/symptoms] Analysis failed:", err.message);
    return {
      insights: kbResults.map(e => ({
        cultural_expression: e.cultural_expression,
        literal_translation: e.literal_translation,
        clinical_mapping: e.clinical_mapping,
        icd10_codes: e.icd10_codes,
        recommended_screenings: e.recommended_screenings,
        confidence: e.confidence_level,
        source: e.source_citation,
        body_system: e.body_system,
        alert_level: "warning",
      })),
      raw_text: text,
      language_code: languageCode,
      method: "knowledge_base_fallback",
      error: err.message,
    };
  }
}

// ────────────────────────────────────────────────────────────────────────────
// analyzeFood  — uses gemini-2.5-flash (visionModel)
// Now produces a `patient_message` field already translated into the patient's
// language so DietPage can display it natively without a second round-trip.
// ────────────────────────────────────────────────────────────────────────────

/** Maps our internal language codes to BCP-47 names for the model prompt */
const LANG_DISPLAY = {
  vi: "Vietnamese",  es: "Spanish",  ht: "Haitian Creole", hi: "Hindi",
  zh: "Mandarin Chinese", tl: "Tagalog", ko: "Korean",
  ar: "Arabic", fa: "Farsi (Persian)", en: "English",
};

async function analyzeFood(imageUrl, languageCode, dietaryRestrictions = []) {
  const langName = LANG_DISPLAY[languageCode] || languageCode;

  // ── Mock when no API key ─────────────────────────────────────────────────
  if (!visionModel) {
    return {
      dish_name: "Phở bò",
      dish_name_english: "Vietnamese beef noodle soup",
      cuisine: "Vietnamese",
      ingredients: ["rice noodles", "beef broth", "sliced beef", "bean sprouts", "thai basil", "lime", "hoisin sauce", "sriracha"],
      nutrition_original: { calories: 420, protein_g: 28, sodium_mg: 1850, sugar_g: 4, fat_g: 8, carbs_g: 52, fiber_g: 2 },
      nutrition_adapted: { calories: 380, protein_g: 28, sodium_mg: 980, sugar_g: 4, fat_g: 6, carbs_g: 48, fiber_g: 3 },
      adaptation_notes: "Reduced sodium by using low-sodium broth. Added extra herbs and lime for flavour. Lean beef cuts.",
      hospital_meal_plan: "Serve modified phở with low-sodium broth, extra fresh herbs (basil, cilantro, mint), lean beef, and steamed rice on the side.",
      cultural_notes: "Vietnamese patients prefer soup-based meals when ill. Hot broth is culturally associated with healing. Do NOT substitute Western soup.",
      patient_message: {
        [languageCode]: languageCode === "vi"
          ? "Bữa ăn đã được ghi lại. Bác sĩ đã nhận được kế hoạch dinh dưỡng."
          : "Your meal has been recorded. Your doctor has received the nutrition plan.",
        en: "Your meal has been recorded. The hospital kitchen will prepare a familiar version of this dish.",
      },
      method: "mock",
    };
  }

  // ── Build the prompt ─────────────────────────────────────────────────────
  const restrictionNote = dietaryRestrictions.length > 0
    ? `\nDietary restrictions to respect: ${dietaryRestrictions.join(", ")}.`
    : "";

  const prompt = `You are a clinical nutritionist with deep expertise in multicultural dietary analysis.

Analyze the food photo provided. The patient's preferred language is ${langName} (code: "${languageCode}").${restrictionNote}

Return ONLY a single valid JSON object with this exact structure — no markdown fences, no comments, no text outside the JSON:

{
  "dish_name": "name of the dish in its original language / script",
  "dish_name_english": "English name of the dish",
  "cuisine": "cuisine type (e.g., Vietnamese, Latin American, Chinese)",
  "ingredients": ["ingredient1", "ingredient2"],
  "nutrition_original": {
    "calories": 0,
    "protein_g": 0,
    "sodium_mg": 0,
    "sugar_g": 0,
    "fat_g": 0,
    "carbs_g": 0,
    "fiber_g": 0
  },
  "nutrition_adapted": {
    "calories": 0,
    "protein_g": 0,
    "sodium_mg": 0,
    "sugar_g": 0,
    "fat_g": 0,
    "carbs_g": 0,
    "fiber_g": 0
  },
  "adaptation_notes": "What was changed and why (English)",
  "hospital_meal_plan": "Specific, practical preparation instructions for the hospital kitchen — keep the dish culturally recognisable (English)",
  "cultural_notes": "Why this food matters to the patient; what must NOT be substituted (English, for clinical staff)",
  "patient_message": {
    "${languageCode}": "A warm, simple confirmation message for the patient in ${langName} using its native script. Example: tell them their meal was recognised and the kitchen will prepare a familiar version. Max 2 sentences.",
    "en": "Same confirmation message in plain English for clinical staff."
  }
}

RULES:
1. Estimate nutrition figures realistically from the photo.
2. Adapted version MUST bring sodium below 1 000 mg and limit added sugar, while keeping the dish recognisable.
3. hospital_meal_plan must be practical and specific enough for a kitchen team to follow.
4. cultural_notes should explain why the dish matters and what Western substitutes are unacceptable.
5. patient_message in ${langName} must use the correct native script (e.g., Vietnamese diacritics, Arabic, Devanagari, Hangul, Chinese characters as appropriate).
6. Return ONLY valid JSON. Absolutely no text, explanation, or markdown outside the JSON object.`;

  // ── Resolve image to inline base64 ──────────────────────────────────────
  let mimeType = "image/jpeg";
  let base64Data = imageUrl;

  try {
    if (typeof imageUrl === "string" && imageUrl.startsWith("data:")) {
      const match = imageUrl.match(/^data:([^;]+);base64,(.+)$/);
      if (match) { mimeType = match[1]; base64Data = match[2]; }
    } else if (typeof imageUrl === "string" && /^https?:\/\//.test(imageUrl)) {
      const resp = await fetch(imageUrl);
      if (!resp.ok) throw new Error(`Image fetch failed: ${resp.status}`);
      const buf = await resp.arrayBuffer();
      base64Data = Buffer.from(buf).toString("base64");
      const ct = resp.headers.get("content-type");
      if (ct) mimeType = ct.split(";")[0].trim();
    }
  } catch (fetchErr) {
    console.error("[Gemini/food] Image fetch error:", fetchErr.message);
    return { error: `Could not load image: ${fetchErr.message}`, method: "failed" };
  }

  // ── Call gemini-2.5-flash ────────────────────────────────────────────────
  try {
    console.log(`[Gemini/food] Analysing image with ${VISION_MODEL} (lang=${languageCode})…`);
    const result = await visionModel.generateContent([
      prompt,
      { inlineData: { mimeType, data: base64Data } },
    ]);

    const rawText = result.response.text();
    const parsed  = parseModelJson(rawText);

    console.log(`[Gemini/food] ✓ Identified: ${parsed.dish_name_english || parsed.dish_name}`);
    return { ...parsed, method: `${VISION_MODEL}_vision` };
  } catch (err) {
    console.error("[Gemini/food] Analysis failed:", err.message);
    return { error: err.message, method: "failed" };
  }
}

// ────────────────────────────────────────────────────────────────────────────
// simplifyCareInstructions — uses gemini-2.5-flash (visionModel)
// Upgraded from gemma so multilingual output quality matches the food analysis.
// ────────────────────────────────────────────────────────────────────────────
async function simplifyCareInstructions(text, targetLanguageCode) {
  const langName = LANG_DISPLAY[targetLanguageCode] || targetLanguageCode;

  if (!visionModel) {
    return { simplified_english: text, translated: text, method: "passthrough" };
  }

  const prompt = `You are a medical communication specialist. Simplify the care instruction below into plain, warm language that a family member with no medical background can understand. Then translate the simplified version into ${langName}.

Original instruction:
"${text}"

Return ONLY a single valid JSON object — no markdown, no text outside the JSON:
{
  "simplified_english": "Simplified version in plain English. Short sentences. No jargon. Warm tone.",
  "translated": "Simplified version translated into ${langName} using the correct native script (e.g., ${
    targetLanguageCode === "zh" ? "Chinese characters" :
    targetLanguageCode === "ar" ? "Arabic script" :
    targetLanguageCode === "hi" ? "Devanagari" :
    targetLanguageCode === "fa" ? "Persian script" :
    targetLanguageCode === "ko" ? "Hangul" :
    targetLanguageCode === "vi" ? "Vietnamese with diacritics" :
    "appropriate native script"
  }).",
  "key_actions": ["Action 1 — one short sentence", "Action 2"],
  "warning_signs": ["Sign 1 — when the family should call the doctor"]
}

RULES:
- Use simple vocabulary. Short sentences. Maximum 3rd-grade reading level.
- The translated field MUST be in ${langName} using its native script, not transliteration.
- key_actions and warning_signs in English (they appear on the doctor dashboard).
- Return ONLY valid JSON.`;

  try {
    console.log(`[Gemini/care] Simplifying + translating to ${langName} with ${VISION_MODEL}…`);
    const result = await visionModel.generateContent(prompt);
    const parsed  = parseModelJson(result.response.text());
    return { ...parsed, method: VISION_MODEL };
  } catch (err) {
    console.error("[Gemini/care] Simplification failed:", err.message);
    return { simplified_english: text, translated: text, method: "fallback", error: err.message };
  }
}

module.exports = { initGemini, analyzeSymptoms, analyzeFood, simplifyCareInstructions };
