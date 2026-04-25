
const { searchKnowledgeBase } = require("./knowledge-base");

let genAI = null;
let model = null;
let visionModel = null;

function initGemini() {
  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey || apiKey === "your_gemini_api_key") {
    console.warn("[Gemini] API key not configured. Using mock responses.");
    return false;
  }

  const { GoogleGenerativeAI } = require("@google/generative-ai");
  genAI = new GoogleGenerativeAI(apiKey);
  model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
  visionModel = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
  console.log("[Gemini] Initialized with gemini-2.0-flash.");
  return true;
}

async function analyzeSymptoms(text, languageCode) {
  const kbResults = searchKnowledgeBase(text, languageCode, 3);

  const kbContext = kbResults.length > 0
    ? kbResults.map((e) =>
        `- Expression: "${e.cultural_expression}" (${e.language})\n  Literal: "${e.literal_translation}"\n  Clinical: ${e.clinical_mapping}\n  ICD-10: ${e.icd10_codes.join(", ")}\n  Screenings: ${e.recommended_screenings.join(", ")}\n  Source: ${e.source_citation}`
      ).join("\n\n")
    : "No exact matches found in the cultural knowledge base. Analyze based on general cultural-medical knowledge.";

  if (!model) {
    return {
      insights: kbResults.map((e) => ({
        cultural_expression: e.cultural_expression,
        literal_translation: e.literal_translation,
        clinical_mapping: e.clinical_mapping,
        icd10_codes: e.icd10_codes,
        recommended_screenings: e.recommended_screenings,
        confidence: e.confidence_level,
        source: e.source_citation,
        body_system: e.body_system,
        alert_level: e.body_system.includes("cardiovascular") || e.body_system.includes("URGENT") ? "critical" : "warning",
      })),
      raw_text: text,
      language_code: languageCode,
      method: "knowledge_base_only",
    };
  }

  const prompt = `You are a clinical cultural intelligence system. A patient who speaks ${languageCode} has described their symptoms using cultural language.

PATIENT INPUT: "${text}"

CULTURAL KNOWLEDGE BASE MATCHES:
${kbContext}

Based on the knowledge base matches and your medical knowledge, generate a JSON response with the following structure:
{
  "insights": [
    {
      "cultural_expression": "the exact cultural phrase",
      "literal_translation": "word-for-word English translation",
      "clinical_mapping": "what this likely means clinically, in 1-2 sentences",
      "icd10_codes": ["relevant ICD-10 codes"],
      "recommended_screenings": ["specific tests or assessments to perform"],
      "confidence": "high|medium|low",
      "body_system": "affected body system",
      "alert_level": "critical|warning|info"
    }
  ]
}

RULES:
- Prioritize knowledge base matches over general knowledge.
- If the expression matches a knowledge base entry with high confidence, use that data directly.
- If no exact match, use the closest cultural-medical knowledge available.
- Always err on the side of recommending more screenings, not fewer.
- Mark cardiovascular, neurologic emergencies, and pediatric dehydration as "critical" alert level.
- Return ONLY valid JSON. No markdown, no explanation outside the JSON.`;

  try {
    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    const cleaned = responseText.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const parsed = JSON.parse(cleaned);
    return { ...parsed, raw_text: text, language_code: languageCode, method: "gemini_rag" };
  } catch (err) {
    console.error("[Gemini] Symptom analysis failed:", err.message);
    return {
      insights: kbResults.map((e) => ({
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

async function analyzeFood(imageUrl, languageCode, dietaryRestrictions = []) {
  if (!visionModel) {
    return {
      dish_name: "Pho bo",
      dish_name_english: "Vietnamese beef noodle soup",
      cuisine: "Vietnamese",
      ingredients: ["rice noodles", "beef broth", "thinly sliced beef", "bean sprouts", "thai basil", "lime", "hoisin sauce", "sriracha"],
      nutrition_original: { calories: 420, protein_g: 28, sodium_mg: 1850, sugar_g: 4, fat_g: 8, carbs_g: 52, fiber_g: 2 },
      nutrition_adapted: { calories: 380, protein_g: 28, sodium_mg: 980, sugar_g: 4, fat_g: 6, carbs_g: 48, fiber_g: 3 },
      adaptation_notes: "Reduced sodium by using low-sodium broth. Added extra herbs and lime for flavor. Switched to lean beef cuts. Added steamed rice side for familiar texture.",
      hospital_meal_plan: "Serve modified pho with reduced-sodium broth, extra fresh herbs (basil, cilantro, mint), lean beef, and steamed rice on the side. Patient is familiar with this food and is likely to eat it, improving nutritional intake and recovery.",
      cultural_notes: "Vietnamese patients often prefer soup-based meals, especially when ill. Hot broth is culturally associated with healing. Do NOT substitute with Western soup (chicken noodle) as the flavor profile is entirely different.",
      method: "mock",
    };
  }

  const prompt = `You are a clinical nutritionist with expertise in multicultural dietary analysis.

Analyze this food photo. The patient speaks ${languageCode}.
${dietaryRestrictions.length > 0 ? `Dietary restrictions: ${dietaryRestrictions.join(", ")}` : ""}

Return a JSON response:
{
  "dish_name": "name in original language",
  "dish_name_english": "English name",
  "cuisine": "cuisine type",
  "ingredients": ["ingredient1", "ingredient2"],
  "nutrition_original": { "calories": 0, "protein_g": 0, "sodium_mg": 0, "sugar_g": 0, "fat_g": 0, "carbs_g": 0, "fiber_g": 0 },
  "nutrition_adapted": { "calories": 0, "protein_g": 0, "sodium_mg": 0, "sugar_g": 0, "fat_g": 0, "carbs_g": 0, "fiber_g": 0 },
  "adaptation_notes": "what was changed and why",
  "hospital_meal_plan": "specific preparation instructions for hospital kitchen, keeping the dish culturally familiar",
  "cultural_notes": "important cultural context about this food for the provider"
}

RULES:
- Estimate nutrition realistically.
- Adapted version should reduce sodium below 1000mg and limit sugar, while keeping the dish recognizable.
- Hospital meal plan must be practical and specific.
- Cultural notes should explain why this food matters to the patient and what NOT to substitute.
- Return ONLY valid JSON.`;

  try {
    // Accept either (1) data URL "data:image/jpeg;base64,..." (2) raw base64
    // (3) http(s):// URL (fetched and inlined). Gemini inlineData requires raw
    // base64 with the correct mimeType.
    let mimeType = "image/jpeg";
    let base64Data = imageUrl;
    if (typeof imageUrl === "string" && imageUrl.startsWith("data:")) {
      const match = imageUrl.match(/^data:([^;]+);base64,(.+)$/);
      if (match) {
        mimeType = match[1];
        base64Data = match[2];
      }
    } else if (typeof imageUrl === "string" && /^https?:\/\//.test(imageUrl)) {
      const resp = await fetch(imageUrl);
      const arrayBuffer = await resp.arrayBuffer();
      base64Data = Buffer.from(arrayBuffer).toString("base64");
      const ct = resp.headers.get("content-type");
      if (ct) mimeType = ct.split(";")[0].trim();
    }

    const result = await visionModel.generateContent([
      prompt,
      { inlineData: { mimeType, data: base64Data } },
    ]);
    const responseText = result.response.text();
    const cleaned = responseText.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    return { ...JSON.parse(cleaned), method: "gemini_vision" };
  } catch (err) {
    console.error("[Gemini] Food analysis failed:", err.message);
    return { error: err.message, method: "failed" };
  }
}

async function simplifyCareInstructions(text, targetLanguage) {
  if (!model) {
    return {
      simplified: text,
      language: targetLanguage,
      method: "passthrough",
    };
  }

  const prompt = `Simplify this medical care instruction into plain, warm language that a family member with no medical background would understand. Then translate it into ${targetLanguage}.

Original: "${text}"

Return JSON:
{
  "simplified_english": "simplified version in English",
  "translated": "simplified version in ${targetLanguage}",
  "key_actions": ["action 1", "action 2"],
  "warning_signs": ["when to call doctor"]
}

Be warm, clear, and specific. Use short sentences. No medical jargon. Return ONLY valid JSON.`;

  try {
    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    const cleaned = responseText.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    return { ...JSON.parse(cleaned), method: "gemini" };
  } catch (err) {
    console.error("[Gemini] Simplification failed:", err.message);
    return { simplified_english: text, translated: text, method: "fallback", error: err.message };
  }
}

module.exports = { initGemini, analyzeSymptoms, analyzeFood, simplifyCareInstructions };
