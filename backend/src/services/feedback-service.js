const fs = require("fs");
const path = require("path");
const { getDB } = require("../../config/database");

const DATA_DIR = path.resolve(__dirname, "../../.data");
const FB_FILE = path.join(DATA_DIR, "doctor_feedback.json");

function ensureDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(FB_FILE)) fs.writeFileSync(FB_FILE, JSON.stringify({ feedback: [] }, null, 2));
}
function readFile() { ensureDir(); return JSON.parse(fs.readFileSync(FB_FILE, "utf-8")); }
function writeFile(data) { ensureDir(); fs.writeFileSync(FB_FILE, JSON.stringify(data, null, 2)); }

async function recordFeedback(input) {
  const fb = {
    id: "fb_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 5),
    session_id: input.session_id,
    target_type: input.target_type,        // "symptom_insight" | "dietary" | "voice_message" | "knowledge_search"
    target_id: input.target_id,
    doctor_id: input.doctor_id,
    verdict: input.verdict,                // approved | modified | rejected
    notes: input.notes || null,
    created_at: new Date().toISOString(),
  };

  const db = getDB();
  if (db) {
    await db.collection("doctor_feedback").insertOne({ ...fb });
    return fb;
  }

  const data = readFile();
  data.feedback.push(fb);
  writeFile(data);
  return fb;
}

async function listForSession(sessionId) {
  const db = getDB();
  if (db) {
    return db.collection("doctor_feedback")
      .find({ session_id: sessionId }, { projection: { _id: 0 } })
      .sort({ created_at: -1 })
      .toArray();
  }
  const data = readFile();
  return data.feedback
    .filter((f) => f.session_id === sessionId)
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
}

async function summary() {
  const db = getDB();
  let all;
  if (db) {
    all = await db.collection("doctor_feedback").find({}, { projection: { _id: 0 } }).toArray();
  } else {
    all = readFile().feedback;
  }
  const counts = { approved: 0, modified: 0, rejected: 0, total: all.length };
  for (const f of all) if (counts[f.verdict] !== undefined) counts[f.verdict]++;
  const approval_rate = counts.total ? (counts.approved / counts.total) : 0;
  return { ...counts, approval_rate };
}

module.exports = { recordFeedback, listForSession, summary };
