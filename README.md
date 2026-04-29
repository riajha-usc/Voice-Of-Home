<div align="center">

<br />

```
 ██╗   ██╗ ██████╗ ██╗ ██████╗███████╗███████╗     ██████╗ ███████╗
 ██║   ██║██╔═══██╗██║██╔════╝██╔════╝██╔════╝    ██╔═══██╗██╔════╝
 ██║   ██║██║   ██║██║██║     █████╗  ███████╗    ██║   ██║█████╗
 ╚██╗ ██╔╝██║   ██║██║██║     ██╔══╝  ╚════██║    ██║   ██║██╔══╝
  ╚████╔╝ ╚██████╔╝██║╚██████╗███████╗███████║    ╚██████╔╝██║
   ╚═══╝   ╚═════╝ ╚═╝ ╚═════╝╚══════╝╚══════╝     ╚═════╝ ╚═╝

  ██╗  ██╗ ██████╗ ███╗   ███╗███████╗
  ██║  ██║██╔═══██╗████╗ ████║██╔════╝
  ███████║██║   ██║██╔████╔██║█████╗
  ██╔══██║██║   ██║██║╚██╔╝██║██╔══╝
  ██║  ██║╚██████╔╝██║ ╚═╝ ██║███████╗
  ╚═╝  ╚═╝ ╚═════╝ ╚═╝     ╚═╝╚══════╝
```

### *We do not translate words. We translate worlds.*

### A Multi-Agent Cultural Intelligence Platform for Healthcare
**LA Hacks 2026 | Catalyst for Care + Agentverse**


<br />

[![LA Hacks 2026](https://img.shields.io/badge/LA%20Hacks%202026-UCLA%20Pauley%20Pavilion-E8695A?style=for-the-badge)](https://lahacks.com)
[![Track](https://img.shields.io/badge/Track-Catalyst%20for%20Care-1E8C66?style=for-the-badge)](#)
[![Agentverse](https://img.shields.io/badge/Agentverse-4%20Live%20Agents-B07818?style=for-the-badge)](https://agentverse.ai)
[![Languages](https://img.shields.io/badge/Languages-10%20Supported-3B82F6?style=for-the-badge)](#)

<br />

</div>

---

## The Problem

A graduate student from Hyderabad walks into UCLA Medical Center with chest pain.

She says: **"पेट में आग लगती है"** - *fire burning in my stomach.*

The interpreter hears fire. The doctor writes *unclear complaint.* She waits three hours. She has peptic ulcer disease and probable H. pylori infection - a condition with higher prevalence in South Asian populations, mapped to ICD-10 K25.9.

This is not a translation failure. **It is a cultural intelligence failure.**

> **45%** of international students in the US report significant anxiety or depression - and **72%** avoid seeking care due to language and cultural barriers. *(ACHA-NCHA 2023 / Journal of International Students 2022)*
>
> **1 in 3** immigrants in the US is classified as Limited English Proficient. LEP patients face a **3× higher rate** of adverse hospital events than English-speaking patients. *(The Joint Commission, 2021)*
>
> **40%** of LEP patients go home with discharge instructions they cannot read. *(NEJM Catalyst, 2022)*

Standard translation apps translate words. They cannot translate the meaning behind "susto," "hwabyung," "dife nan zo," or "con mèo ngồi trên ngực tôi." They cannot map cultural metaphor to clinical insight. They cannot send a voice message to a grandmother in her own language telling her it is safe to take the pill with food.

**Voices of Home does all of that.**

---

## What It Does

| Surface | What Happens |
|---|---|
| 🎙 **Patient speaks** | Selects their language. Taps mic. Says symptoms in their own words - cultural metaphors, idioms, body-language. Audio never leaves the device. |
| 🧠 **Cultural RAG** | Gemma 4 maps the expression against 37 clinically-validated cultural KB entries across 13 languages. Returns clinical insight, ICD-10 codes, and recommended screenings. |
| 🌐 **Native language back** | Patient sees confirmation in their script - Hindi Devanagari, Arabic, Vietnamese diacritics, Korean Hangul. Can tap **Listen** to hear it voiced by ElevenLabs in their language. |
| 🏥 **Doctor sees a chart** | Not the raw expression. A clean clinical card: what they said, what it means, what to test for. With Approve / Modify / Reject for clinical audit. |
| 📸 **Food photo → meal plan** | Family photographs home food → Cloudinary → Gemini 2.5 Flash identifies dish, maps nutrition, generates a hospital-adapted version - shown to the family in their language. |
| 🔊 **Voiced care instructions** | Doctor types discharge instructions in English → Gemini translates → ElevenLabs voices them → every member of the care circle receives the message in their language. |
| 💬 **Care assistant** | Claude responds to family questions about medications, diet, and discharge - in the patient's selected language. |
| 🧘 **Mental wellness** | A guardrailed emotional check-in surface. Recognizes cultural idioms of distress like *"mere dimaag mein garmi hai"* (heat in my brain - South Asian idiom for anxiety). Pattern-matched against a 600-person cleaned mental health dataset. |

---

## The Orchestration Layer

Voices of Home runs a **four-agent swarm on Fetch.ai Agentverse** - an Orchestrator, a Cultural NLP Agent, a Dietary Agent, and a Voice Synthesis Agent - each implementing the ASI:One chat protocol and discoverable globally. The Orchestrator acts as the intelligence layer, classifying every incoming patient query by intent and routing it to the right specialist agent in real time. Because every agent publishes its manifest on Agentverse and listens via mailbox, the cultural knowledge we built is not locked inside one app - it is **public healthcare infrastructure**, queryable by any clinical system through ASI:One.

```
Patient Query
      │
      ▼
┌─────────────────────┐
│  Orchestrator Agent  │  ← ASI:One chat protocol
│  (Intent Router)     │    Agentverse mailbox
└──────────┬──────────┘
           │
     ┌─────┴──────┐──────────────┐
     ▼            ▼              ▼
┌─────────┐  ┌─────────┐  ┌──────────┐
│Cultural │  │Dietary  │  │  Voice   │
│NLP Agent│  │  Agent  │  │  Agent   │
│         │  │         │  │          │
│KB Search│  │Nutrition│  │ElevenLabs│
│Gemma RAG│  │Cloudinary│ │Synthesis │
└────┬────┘  └────┬────┘  └────┬─────┘
     │             │             │
     └─────────────┴─────────────┘
                   │
                   ▼
          Clinical Insight +
        Patient Explanation +
           Voice Audio
```

---

## Cultural Knowledge Base

**37 clinically-validated entries. 13 languages. Every entry sourced from published medical anthropology literature.**

| Expression | Language | Clinical Mapping | ICD-10 |
|---|---|---|---|
| *dife nan zo* | Haitian Creole | Deep bone pain - sickle cell vaso-occlusive crisis | D57.00, M79.3 |
| *susto* | Spanish | Soul-loss after trauma - acute stress disorder, PTSD | F43.0, F43.10 |
| *con mèo ngồi trên ngực tôi* | Vietnamese | Cat on my chest - angina pectoris | R07.9, I20.9 |
| *pet mein aag lagti hai* | Hindi | Fire in stomach - peptic ulcer, H. pylori | K25.9, K21.0 |
| *hwabyung* | Korean | Fire illness - suppressed anger, somatization | F45.1, F32.9 |
| *qaug dab peg* | Hmong | Spirit catches you - epilepsy (seen as spiritual gift) | G40.909 |
| *qi xu* | Mandarin | Qi deficiency - anemia, hypothyroidism, heart failure | R53.83, D64.9 |
| *narahati-e ghalb* | Farsi | Heart discomfort - cardiac AND emotional distress | R07.9, F41.1 |

Sources include Fadiman, Kleinman, Farmer, DSM-5 Cultural Concepts of Distress, and 14 peer-reviewed journals.

---

## Tech Stack

```
Frontend          React 19 + Vite + Tailwind v4
Backend           Node.js / Express
Database          MongoDB Atlas (file-backed fallback for dev)
Auth              Auth0 (doctor portal - social login, MFA, passwordless)
AI - Symptoms     Gemma 4 31B-IT (cultural RAG, structured clinical reasoning)
AI - Vision       Gemini 2.5 Flash (food photo analysis, multimodal)
AI - Translation  Gemini 2.5 Flash (care instructions → 10 languages + native scripts)
AI - Chat         Claude Sonnet (care assistant + mental wellness - responds in patient language)
Voice             ElevenLabs eleven_multilingual_v2
Speech            Browser SpeechRecognition API (Zetic Melange on-device Whisper - mobile path)
Media             Cloudinary (food photo upload, AI tagging, CDN)
Agents            Fetch.ai uAgents on Agentverse (ASI:One chat protocol)
Networking        Arista - routes patient data to providers, families, and clinical systems
Domain            voicesofhome.care (GoDaddy Registry)
```

---

## Company Challenges

| Challenge | Prize | Integration |
|---|---|---|
| **Fetch.ai / Agentverse** | $5,000 | 4 uAgents live on Agentverse. Orchestrator routes to Cultural NLP, Dietary, Voice agents. ASI:One chat protocol. Globally discoverable. |
| **Gemini / Gemma (MLH)** | Google Swag | Gemma 4 31B-IT for symptom RAG. Gemini 2.5 Flash for food vision, care translation, native-script patient explanations. |
| **ElevenLabs (MLH)** | Earbuds | eleven_multilingual_v2 for all voice output. Patient listens to diagnosis in their language. Care circle receives voiced discharge instructions. |
| **Cloudinary** | $2,000 | Food photo → Cloudinary CDN → Gemini vision → hospital meal plan in native language. Real upload pipeline. |
| **Auth0 (MLH)** | Swag | Doctor portal gated with Auth0. Social login, MFA-capable, passwordless. Patient view stays open - no access barrier for patients. |
| **Arista Networks** | Swag | Routes clinical data from patient voice to doctor chart, dietary photos to kitchen, care instructions to every family member's phone. Networking as healthcare infrastructure. |
| **GoDaddy (MLH)** | Gift Card | voicesofhome.care - the .care TLD is intentional. |

---

## Running It

```bash
# 1. Clone and install
git clone https://github.com/your-org/voices-of-home
cd voices-of-home && npm run setup

# 2. Configure environment
cp .env.example .env
# Add: GOOGLE_API_KEY, ANTHROPIC_API_KEY, ELEVENLABS_API_KEY,
#      CLOUDINARY_*, MONGODB_URI, FETCH_AGENT_SEED_PHRASE

# 3. Seed the database
cd backend && npm run seed && npm run seed:hospitals

# 4. Run
npm run dev          # starts backend (3001) + frontend (5173)
npm run dev:agents   # starts all 4 Fetch.ai agents locally

# 5. Register agents on Agentverse
npm run register:agents
```

Open `localhost:5173` - family view.
Open `localhost:5173/doctor` - provider view (Auth0 gated).

The app works fully without API keys using the file-backed fallback. Add keys one at a time to activate each real AI service.

---

## Project Structure

```
voices-of-home/
├── frontend/               React app - family view + doctor portal
│   └── src/
│       ├── pages/          SymptomsPage, DietPage, FamilyPage, MentalHealthPage,
│       │                   DoctorHome, DoctorPatientDetail, OnboardingPage
│       ├── utils/          translations.js (10 languages, native scripts)
│       └── hooks/          useSession.jsx (MongoDB-backed shared state)
├── backend/                Express API
│   └── src/
│       ├── services/       gemini, claude, elevenlabs, cloudinary, knowledge-base
│       └── routes/         api.js (symptoms, dietary, voice, chat, sessions, feedback)
├── agents/                 Fetch.ai uAgents (Agentverse)
│   ├── orchestrator_agent.py
│   ├── cultural_nlp_agent.py
│   ├── dietary_agent.py
│   └── voice_agent.py
├── mcp-server/             MCP server for Windsurf/Devin (Cognition-ready)
└── shared/
    ├── cultural-knowledge-base.json   37 entries, 13 languages, ICD-10 codes
    ├── hospitals-seed.json             3 LA hospitals, 8 doctors
    └── mental-health-personas.json    600-person dataset personas
```

---

## The Ask

We built Voices of Home in 48 hours. The cultural knowledge base took real research. The architecture is production-ready - MongoDB persistence, Auth0 authentication, real Cloudinary uploads, real ElevenLabs audio, real Agentverse agents.

What it needs next: hospital partnerships, a mobile app with Zetic on-device speech, and an expanded knowledge base across 50+ languages. The 37 entries we have are a proof of concept. The 25 million LEP patients in the US need the other 963.

---

<div align="center">

**Built at LA Hacks 2026 · UCLA Pauley Pavilion · 48 hours**

*Catalyst for Care · Agentverse · Gemini · ElevenLabs · Cloudinary · Auth0 · Arista · GoDaddy*

<br />

**"We do not translate words. We translate worlds."**

[voicesofhome.care](https://voicesofhome.care)

</div>
