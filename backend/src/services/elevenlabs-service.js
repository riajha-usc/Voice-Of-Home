
const ELEVENLABS_BASE = "https://api.elevenlabs.io/v1";

const VOICE_MAP = {
  vi: { voice_id: "EXAVITQu4vr4xnSDxMaL", name: "Sarah" },   // warm female
  es: { voice_id: "EXAVITQu4vr4xnSDxMaL", name: "Sarah" },
  ht: { voice_id: "EXAVITQu4vr4xnSDxMaL", name: "Sarah" },
  hi: { voice_id: "EXAVITQu4vr4xnSDxMaL", name: "Sarah" },
  zh: { voice_id: "EXAVITQu4vr4xnSDxMaL", name: "Sarah" },
  ko: { voice_id: "EXAVITQu4vr4xnSDxMaL", name: "Sarah" },
  tl: { voice_id: "EXAVITQu4vr4xnSDxMaL", name: "Sarah" },
  ar: { voice_id: "EXAVITQu4vr4xnSDxMaL", name: "Sarah" },
  fa: { voice_id: "EXAVITQu4vr4xnSDxMaL", name: "Sarah" },
  en: { voice_id: "EXAVITQu4vr4xnSDxMaL", name: "Sarah" },
};

async function generateVoice(text, languageCode = "en") {
  const apiKey = process.env.ELEVENLABS_API_KEY;

  if (!apiKey || apiKey === "your_elevenlabs_api_key") {
    console.warn("[ElevenLabs] API key not configured. Returning mock audio URL.");
    return {
      audio: null,
      duration_seconds: Math.ceil(text.length / 15), // rough estimate
      method: "mock",
      message: "ElevenLabs API key not configured. Set ELEVENLABS_API_KEY in .env",
    };
  }

  const voice = VOICE_MAP[languageCode] || VOICE_MAP["en"];

  try {
    const response = await fetch(`${ELEVENLABS_BASE}/text-to-speech/${voice.voice_id}`, {
      method: "POST",
      headers: {
        "Accept": "audio/mpeg",
        "Content-Type": "application/json",
        "xi-api-key": apiKey,
      },
      body: JSON.stringify({
        text,
        model_id: "eleven_multilingual_v2",
        voice_settings: {
          stability: 0.75,
          similarity_boost: 0.75,
          style: 0.3,          // slightly warm and caring
          use_speaker_boost: true,
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`ElevenLabs API error ${response.status}: ${errorText}`);
    }

    const audioBuffer = Buffer.from(await response.arrayBuffer());
    const durationEstimate = Math.ceil(text.length / 15);

    return {
      audio: audioBuffer,
      duration_seconds: durationEstimate,
      voice_name: voice.name,
      language_code: languageCode,
      characters_used: text.length,
      method: "elevenlabs",
    };
  } catch (err) {
    console.error("[ElevenLabs] Voice generation failed:", err.message);
    return {
      audio: null,
      duration_seconds: 0,
      method: "failed",
      error: err.message,
    };
  }
}

async function checkQuota() {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey || apiKey === "your_elevenlabs_api_key") {
    return { configured: false };
  }

  try {
    const response = await fetch(`${ELEVENLABS_BASE}/user/subscription`, {
      headers: { "xi-api-key": apiKey },
    });
    const data = await response.json();
    return {
      configured: true,
      characters_remaining: data.character_limit - data.character_count,
      characters_limit: data.character_limit,
      characters_used: data.character_count,
    };
  } catch (err) {
    return { configured: true, error: err.message };
  }
}

module.exports = { generateVoice, checkQuota };
