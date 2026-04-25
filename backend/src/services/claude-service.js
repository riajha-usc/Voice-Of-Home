
let anthropic = null;

function initClaude() {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey || apiKey === "your_anthropic_api_key") {
    console.warn("[Claude] API key not configured. Using mock responses.");
    return false;
  }

  const Anthropic = require("@anthropic-ai/sdk");
  anthropic = new Anthropic({ apiKey });
  console.log("[Claude] Initialized.");
  return true;
}

async function chat(message, patientContext = {}, chatHistory = [], languageCode = null) {
  const langName = patientContext.language || resolveLanguageName(languageCode) || "not specified";
  const systemPrompt = `You are a caring, patient healthcare communication assistant for Voices of Home. You help family members of hospital patients understand medical information in plain, warm language.

PATIENT CONTEXT:
- Language: ${langName}
- Conditions: ${(patientContext.conditions || []).join(", ") || "not specified"}
- Current medications: ${(patientContext.medications || []).join(", ") || "not specified"}
- Dietary restrictions: ${(patientContext.dietary_restrictions || []).join(", ") || "none specified"}

RESPONSE LANGUAGE:
${langName && langName !== "not specified" && langName !== "English"
    ? `ALWAYS respond in ${langName}, using the native script for that language. Do not translate to English unless the user explicitly writes to you in English. The patient's family needs to understand you in their own language.`
    : "Respond in the language the family member writes in."}

RULES:
1. Use simple, warm language. No medical jargon. Short sentences.
2. Always end medication-related answers with: "Please confirm with the doctor before changing anything." (translated into the patient's language).
3. If you are unsure about a medical fact, say so clearly. Never guess about drug interactions.
4. Be empathetic. These are scared family members trying to help someone they love.
5. Keep responses concise (3-5 sentences for simple questions, up to 8 for complex ones).
6. If asked about something outside healthcare (e.g., legal, financial), acknowledge it warmly but suggest they speak with the appropriate professional.`;

  if (!anthropic) {
    return {
      reply: getMockReply(message),
      disclaimer: "This is a mock response. Configure ANTHROPIC_API_KEY for real responses.",
      method: "mock",
    };
  }

  try {
    const messages = [
      ...chatHistory.map((m) => ({ role: m.role, content: m.content })),
      { role: "user", content: message },
    ];

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 500,
      system: systemPrompt,
      messages,
    });

    return {
      reply: response.content[0].text,
      method: "claude",
    };
  } catch (err) {
    console.error("[Claude] Chat failed:", err.message);
    return {
      reply: "I'm having trouble connecting right now. Please try again in a moment, or ask your nurse for help.",
      method: "fallback",
      error: err.message,
    };
  }
}

function getMockReply(message) {
  const lower = message.toLowerCase();
  if (lower.includes("pill") || lower.includes("medication") || lower.includes("medicine")) {
    return "Based on the patient's current medications, it's important to take them with food to reduce stomach discomfort. Morning with breakfast is usually the best time. Please confirm with the doctor before changing any medication timing.";
  }
  if (lower.includes("discharge") || lower.includes("leave") || lower.includes("go home")) {
    return "Discharge instructions will be provided by the medical team. I can help explain any part of the discharge paperwork that is confusing. Would you like me to simplify a specific instruction?";
  }
  if (lower.includes("eat") || lower.includes("food") || lower.includes("diet")) {
    return "The dietary team has prepared a meal plan adapted to foods your family member is familiar with. This helps ensure they eat well during recovery. You can view the adapted meal plan in the Diet tab.";
  }
  return "I'm here to help you understand your family member's care. You can ask me about medications, discharge instructions, dietary needs, or anything else the medical team has discussed. What would you like to know?";
}

function resolveLanguageName(code) {
  const names = {
    vi: "Vietnamese",
    es: "Spanish",
    ht: "Haitian Creole",
    hi: "Hindi",
    zh: "Mandarin Chinese",
    tl: "Tagalog",
    ko: "Korean",
    ar: "Arabic",
    fa: "Farsi (Persian)",
    en: "English",
  };
  return code ? names[code] || null : null;
}

module.exports = { initClaude, chat };
