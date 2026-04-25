# Voices of Home

### A Multi-Agent Cultural Intelligence Platform for Healthcare
**LA Hacks 2026 | Catalyst for Care + Agentverse**

> *"We do not translate words. We translate worlds."*

---

## What It Does

Voices of Home bridges the cultural context gap between immigrant patients and the healthcare system. It uses a swarm of specialized AI agents to:

1. **Map cultural symptom metaphors to clinical insights** — When a Vietnamese grandmother says "a cat is sitting on my chest," our system tells the doctor it means cardiac pressure, not confusion.
2. **Generate culturally-adapted meal plans from food photos** — Photograph what the patient eats at home, get a hospital-compatible version of familiar food.
3. **Deliver care instructions as warm voice messages** — In the patient's native language, to every family member.
4. **Provide an empathetic care assistant** — Family members can ask questions about medications, discharge, and insurance in plain language.

## Tracks

- **Catalyst for Care** (Primary) — Healthcare innovation
- **Agentverse** (Secondary) — AI agents on Fetch.ai ($5,000)

## Company Challenges (6)

| Challenge | Prize | Integration |
|-----------|-------|-------------|
| Fetch.ai / Agentverse | $5,000 | 4 uAgents: Cultural NLP, Dietary, Voice, Orchestrator |
| Cloudinary | $2,000 | Food photo upload pipeline (auto-tag, CDN, transformations) |
| Gemini API (MLH) | Swag | Cultural symptom RAG, food vision, care instruction simplification, patient-facing explanations (gemini-2.0-flash) |
| ElevenLabs (MLH) | Earbuds | Multilingual voice for every in-app message (eleven_multilingual_v2) |
| Zetic / Melange | $2,000 | On-device Whisper speech-to-text wrapper (Melange when available, Web Speech fallback) |
| GoDaddy (MLH) | Gift Card | voicesofhome.care domain |

## Quick Start

```bash
# 1. Clone and install
git clone <repo-url>
cd voices-of-home
cp .env.example .env
# Fill in your API keys in .env

# 2. Install backend dependencies
cd backend && npm install

# 3. Start backend (works without any API keys in mock mode)
npm run dev

# 4. Seed knowledge base (requires MONGODB_URI)
npm run seed
```

The server starts in **mock mode** if API keys are missing — all endpoints return realistic placeholder data so you can develop the frontend independently.

## Tech Stack

- **Frontend**: React + Vite + Tailwind CSS v4
- **Backend**: Node.js + Express
- **AI**: Google Gemini 2.0 Flash + Claude Sonnet + Whisper (on-device via Zetic Melange)
- **Voice**: ElevenLabs Multilingual v2
- **Media**: Cloudinary (upload, AI tagging, CDN)
- **Database**: MongoDB Atlas
- **Agents**: Fetch.ai uAgents Framework on Agentverse

## Cultural Knowledge Base

40+ clinically-validated cultural symptom expressions across 10 languages, sourced from published medical anthropology literature including Kleinman, Fadiman, and peer-reviewed journals.

## License

MIT
