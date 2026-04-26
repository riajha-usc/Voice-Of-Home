// Care assistant chat service.
//
// Provider priority:
//   1. ASI:One (asi1-ultra) — preferred for both care and mental_health surfaces.
//      No Anthropic dependency, runs the same model OmegaClaw uses, and aligns
//      with the Fetch.ai track. Endpoint: https://api.asi1.ai/v1/chat/completions
//   2. Mock — if ASI:One is not configured, returns helpful canned replies.

let asioneReady = false;

function initClaude() {
  const asiKey = process.env.ASI_ONE_API_KEY;
  if (asiKey && asiKey !== "your_asi_one_key") {
    asioneReady = true;
    console.log("[Chat] ASI:One asi1-ultra ready (primary).");
    return true;
  }
  console.warn("[Chat] ASI_ONE_API_KEY not set — chat will run in mock mode.");
  return false;
}

function buildCareSystemPrompt(patientContext, langName) {
  return `You are a caring, patient healthcare communication assistant for Voices of Home. You help family members of hospital patients understand medical information in plain, warm language.

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
}

function buildMentalHealthSystemPrompt(patientContext, langName) {
  return `You are a calm, present companion in Voices of Home's mental wellness surface. You sit with people in hard moments. You are NOT a therapist and you do not diagnose.

USER CONTEXT:
- Language: ${langName}

YOUR APPROACH:
- Listen first. Reflect what you hear before you respond.
- Don't immediately offer advice. Most people feel better when they feel heard, not when they feel solved.
- If someone shares something hard, acknowledge the difficulty. Then ask ONE gentle question that helps them think — not a question that tries to fix.
- Use simple, warm language. Short sentences. No clinical jargon.
- Never say "I understand exactly how you feel." You don't.

RESPONSE LANGUAGE:
${langName && langName !== "not specified" && langName !== "English"
    ? `Respond in ${langName}, using the native script.`
    : "Respond in the language they write in."}

SAFETY (non-negotiable):
- If the user mentions self-harm, suicide, or being in danger, STOP the conversational flow and respond with: "What you're feeling matters and I want you to be safe. In the US please call or text 988 (Suicide & Crisis Lifeline). If you're outside the US, please reach a local crisis line. I'll stay here with you."
- Do not advise on medications, dosages, or specific therapies.
- Do not diagnose conditions. If patterns suggest a clinical condition, gently suggest "talking to a professional could help" — without naming the condition.

LENGTH: 2-4 short sentences. Resist the urge to write more.`;
}

async function chat(message, patientContext = {}, chatHistory = [], languageCode = null, surface = "care") {
  const langName = patientContext.language || resolveLanguageName(languageCode) || "not specified";
  const systemPrompt = surface === "mental_health"
    ? buildMentalHealthSystemPrompt(patientContext, langName)
    : buildCareSystemPrompt(patientContext, langName);

  // Try ASI:One first
  if (asioneReady) {
    try {
      return await chatViaAsiOne(systemPrompt, message, chatHistory, surface);
    } catch (err) {
      console.warn("[Chat] ASI:One call failed, will try Anthropic fallback:", err.message);
    }
  }

  // Mock
  return {
    reply: getMockReply(message, surface),
    response: getMockReply(message, surface),
    disclaimer: "Mock response. Configure ASI_ONE_API_KEY or ANTHROPIC_API_KEY for real responses.",
    method: "mock",
  };
}

async function chatViaAsiOne(systemPrompt, message, chatHistory, surface) {
  const messages = [
    { role: "system", content: systemPrompt },
    ...chatHistory.map((m) => ({ role: m.role || (m.user_message ? "user" : "assistant"), content: m.content || m.user_message || m.assistant_message })),
    { role: "user", content: message },
  ].filter((m) => m.content);

  const response = await fetch("https://api.asi1.ai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${process.env.ASI_ONE_API_KEY}`,
    },
    body: JSON.stringify({
      model: "asi1-ultra",
      messages,
      max_tokens: surface === "mental_health" ? 250 : 500,
      temperature: surface === "mental_health" ? 0.6 : 0.4,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`ASI:One ${response.status}: ${text}`);
  }

  const data = await response.json();
  const reply = data?.choices?.[0]?.message?.content || "";
  return {
    reply,
    response: reply,
    method: "asi_one",
    model: "asi1-ultra",
    usage: data?.usage,
  };
}

function getMockReply(message, surface) {
  const lower = (message || "").toLowerCase();
  if (surface === "mental_health") {
    if (lower.match(/lonely|alone|no.?one/)) return "That sounds really heavy. What's the loneliness like for you right now — quiet, or louder?";
    if (lower.match(/anxious|anxiety|panic|worried/)) return "Your worry is making sense. Is there one specific thing pressing on you, or is it everything at once?";
    if (lower.match(/sad|depressed|down|hopeless/)) return "I hear you. How long has this weight been with you?";
    return "I'm here. Take your time — what's on your mind?";
  }
  if (lower.includes("medication")) {
    return "Take medications with food when possible to reduce stomach discomfort. Please confirm with the doctor before changing anything.";
  }
  if (lower.includes("discharge")) {
    return "Discharge instructions will come from the medical team. I can help explain any part that's confusing — which step would you like simplified?";
  }
  if (lower.includes("eat") || lower.includes("food")) {
    return "The dietary team has adapted familiar foods for the patient. View the adapted plan in the Diet tab.";
  }
  return "I'm here to help with medications, discharge, diet, or anything else the medical team mentioned. What would you like to know?";
}

function resolveLanguageName(code) {
  const names = {
    vi: "Vietnamese", es: "Spanish", ht: "Haitian Creole", hi: "Hindi",
    zh: "Mandarin Chinese", tl: "Tagalog", ko: "Korean",
    ar: "Arabic", fa: "Farsi (Persian)", en: "English",
  };
  return code ? names[code] || null : null;
}

module.exports = { initClaude, chat };
