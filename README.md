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
