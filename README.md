# Voices of Home

### A Multi-Agent Cultural Intelligence Platform for Healthcare
**LA Hacks 2026 | Catalyst for Care + Agentverse**

> *"We do not translate words. We translate worlds."*

---

## What It Does

Voices of Home bridges the cultural context gap between immigrant patients and the healthcare system. It uses a swarm of specialized AI agents to:

1. **Map cultural symptom metaphors to clinical insights** — When a Vietnamese grandmother says "a cat is sitting on my chest," our system tells the doctor it means cardiac pressure, not confusion. Backed by Atlas Vector Search over 37 clinically-validated entries with citations.
2. **Generate culturally-adapted meal plans from food photos** — Photograph what the patient eats at home, get a hospital-compatible version of familiar food.
3. **Deliver care instructions as warm voice messages** — In the patient's native language, to every family member in the care circle.
4. **Provide an empathetic care assistant** — Family members can ask anything in their language. Powered by ASI:One `asi1-ultra` (Anthropic Claude as fallback).
5. **Mental wellness companion** — A separate, tightly-guardrailed surface for international students, immigrants, isolated elders, and the recently laid-off. Listens first, doesn't rush to advice. Pattern-matches against an anonymized 600-person dataset.
6. **Doctor-in-the-loop feedback** — Every AI output on the doctor dashboard has Approve / Modify / Reject buttons. Verdicts persist to `doctor_feedback` for full clinical audit trail.

## Tracks

- **Catalyst for Care** (Primary) — Healthcare innovation
- **Agentverse** (Secondary) — AI agents on Fetch.ai ($5,000)

## Real Data Model (not demo)

Production MongoDB collections:

- `hospitals` — name, address, departments
- `doctors` — name, specialty, NPI, hospital_id, languages_spoken
- `patients` — MRN (auto-generated), name, year_of_birth, sex, language, hospital_id, assigned_doctor_id, conditions, medications, allergies
- `sessions` — session_id, 6-digit join_code, patient_id, hospital_id, assigned_doctor_id, symptom_insights[], dietary_results[], voice_messages[], chat_history[], care_circle[]
- `care_circles` — backed by `sessions.care_circle`, supports add/remove with realtime polling
- `cultural_knowledge` — 37 entries with 768-d Gemini text-embedding-004 vectors
- `doctor_feedback` — every AI output's Approve/Modify/Reject verdict + notes + timestamp
- `mental_health_records` — reserved for the cleaned 600-person dataset

Local-dev fallback: when MongoDB isn't configured, sessions/patients/feedback persist to `backend/.data/*.json` (gitignored).

## Sponsor Coverage

| Sponsor | Prize | Integration |
|---------|-------|-------------|
| **Fetch.ai / Agentverse** | $5,000 | 4 uAgents on Agentverse: `voh-symptom-agent`, `voh-food-agent`, `voh-voice-agent`, `voh-orchestrator-agent` (all `chat_protocol_spec`, `mailbox=True`, `publish_agent_details=True`) |
| **ASI:One** | (Fetch.ai track) | `asi1-ultra` powers the care chat AND the mental wellness companion |
| **Cloudinary** | $2,000 | Food photo upload pipeline, auto-tagging via Google Vision (graceful fallback when add-on missing), CDN, transformations |
| **Google Gemini** *(MLH)* | Swag | Cultural symptom RAG, food vision, care simplification, **text-embedding-004 for vector search** |
| **ElevenLabs** *(MLH)* | Earbuds | Multilingual voice (`eleven_multilingual_v2`) for every in-app message |
| **MongoDB Atlas** *(MLH)* | Swag | Atlas Vector Search (`$vectorSearch`) over the cultural KB, plus all production collections |
| **Zetic / Melange** | $2,000 | On-device Whisper for speech-to-text — patient audio never leaves the phone |
| **GoDaddy** *(MLH)* | Gift card | `voicesofhome.care` |
| **Anthropic Claude** *(MLH)* | Credits | Care assistant fallback when ASI:One unreachable |

## The Agent Swarm

| Agent | Port | Role | Model |
|-------|------|------|-------|
| `voh-symptom-agent` | 8001 | Maps cultural expressions → ICD-10 + screenings | Gemini 2.0 Flash |
| `voh-food-agent` | 8002 | Vision + nutrition + cultural-aware adaptation | Gemini 2.0 Flash (vision) |
| `voh-voice-agent` | 8003 | Care simplification + multilingual TTS | ElevenLabs Multilingual v2 |
| `voh-orchestrator-agent` | 8004 | Routes patient context, coordinates the others | — |

## Quick Start

```bash
# 1. Clone and install
git clone <repo-url>
cd voices-of-home
cp .env.example .env       # then fill in keys (or skip — mock mode works)

# 2. Backend
cd backend
npm install
npm run dev                # http://localhost:3001

# 3. Seed
npm run seed               # cultural knowledge base (needs MONGODB_URI)
npm run seed:hospitals     # hospitals + doctors

# 4. Frontend (separate shell)
cd frontend
npm install
npm run dev                # http://localhost:5173

# 5. Agents (optional — separate shells)
cd agents
pip install -r requirements.txt
python orchestrator_agent.py    # 8004
python cultural_nlp_agent.py    # 8001
python dietary_agent.py         # 8002
python voice_agent.py           # 8003
```

## Atlas Vector Search Setup

The cultural KB embeddings are seeded automatically. To activate `$vectorSearch`, create one Search index in Atlas:

```
Atlas UI → Search → Create Search Index → JSON Editor
Database: voicesofhome   Collection: cultural_knowledge
Index name: cultural_kb_vector
{
  "fields": [
    { "type": "vector", "path": "embedding", "numDimensions": 768, "similarity": "cosine" },
    { "type": "filter", "path": "language_code" }
  ]
}
```

Knowledge search auto-detects vector availability and falls back to in-memory substring scoring if the index isn't ready.

## Privacy Architecture

- Speech stays on-device (Zetic Melange). Audio is never uploaded.
- No PII in agent prompts — agents see structured fields (language code, expression, restrictions).
- Session tokens, not patient identifiers, are used in the doctor dashboard's URL surface.
- `.env` and patient-data fallback files are gitignored. `.gitignore` blocks every credential pattern.

## Cultural Knowledge Base

37 clinically-validated cultural symptom expressions across 13 languages, with native script, literal translation, clinical mapping, ICD-10 codes, recommended screenings, confidence levels, and source citations from Kleinman, Fadiman, Farmer (2006), Brodwin (1996), DeSantis & Thomas (1992), and Desrosiers & Bhatt (2008).

## API Surface

```
GET  /api/health                            Service status
GET  /api/knowledge/search?q=&lang=&mode=   Vector or text search
GET  /api/knowledge/languages
GET  /api/hospitals                         List hospitals
GET  /api/doctors?hospital_id=              Filtered by hospital
POST /api/patients                          Create patient (auto-MRN)
GET  /api/patients/:id

POST /api/sessions                          Returns session_id + 6-digit join_code
GET  /api/sessions/:id                      Aggregated record (poll for realtime)
POST /api/sessions/join                     Join by 6-digit code
POST /api/sessions/:id/care-circle          Add a family member
DEL  /api/sessions/:id/care-circle/:memberId

POST /api/symptoms/analyze                  Cultural NLP (persists to session)
POST /api/dietary/analyze                   Food vision (persists to session)
POST /api/voice/generate                    Simplify + TTS (persists to session)
POST /api/chat                              ASI:One asi1-ultra; surface=care|mental_health
POST /api/upload/food                       Base64 → Cloudinary URL

POST /api/feedback                          Doctor verdict (approved|modified|rejected)
GET  /api/feedback/session/:id              Audit trail per session
GET  /api/feedback/stats                    Approval rate

POST /api/mental-health/match               Pattern lookup over personas/dataset
GET  /api/mental-health/personas
GET  /api/mental-health/stats
```

## Project Structure

```
voices-of-home/
├── agents/                         Fetch.ai uAgents (Python)
├── backend/
│   ├── config/database.js          MongoDB connection + indexes
│   └── src/
│       ├── routes/api.js           Full HTTP surface
│       ├── services/               gemini, claude (ASI:One+Anthropic), elevenlabs,
│       │                           cloudinary, knowledge-base (vector+text),
│       │                           hospital, patient, session, feedback, mental-health
│       └── utils/                  seed-knowledge-base.js, seed-hospitals.js
├── frontend/
│   └── src/
│       ├── pages/                  Onboarding, Symptoms, Diet, Voice, Chat,
│       │                           Family (care circle), MentalHealth, DoctorDashboard
│       ├── hooks/useSession.jsx    Backend-backed, 5s polling, join-by-code
│       ├── components/shared/      UIComponents, FamilyNav
│       └── utils/api.js            API client
├── shared/
│   ├── cultural-knowledge-base.json    37 entries, 13 languages
│   ├── hospitals-seed.json             3 hospitals, 8 doctors
│   └── mental-health-personas.json     3 demo personas + dataset metadata
└── README.md
```

## License

MIT
