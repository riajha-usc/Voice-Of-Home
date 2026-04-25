const fs = require("fs");
const path = require("path");
const { getDB } = require("../../config/database");

// File-backed fallback when MongoDB is not configured.
const DATA_DIR = path.resolve(__dirname, "../../.data");
const SESSIONS_FILE = path.join(DATA_DIR, "sessions.json");

function ensureDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(SESSIONS_FILE)) fs.writeFileSync(SESSIONS_FILE, JSON.stringify({ sessions: [] }, null, 2));
}

function readFile() {
  ensureDir();
  return JSON.parse(fs.readFileSync(SESSIONS_FILE, "utf-8"));
}

function writeFile(data) {
  ensureDir();
  fs.writeFileSync(SESSIONS_FILE, JSON.stringify(data, null, 2));
}

function makeJoinCode() {
  // 6 digit numeric code (no leading zero issues since we toString it)
  return String(Math.floor(100000 + Math.random() * 900000));
}

function emptySessionShape(sessionId, init = {}) {
  return {
    session_id: sessionId,
    join_code: init.join_code || makeJoinCode(),
    patient_id: init.patient_id || null,
    hospital_id: init.hospital_id || null,
    assigned_doctor_id: init.assigned_doctor_id || null,
    language_code: init.language_code || null,
    language_name: init.language_name || null,
    care_circle: init.care_circle || [],
    symptom_insights: init.symptom_insights || [],
    dietary_results: init.dietary_results || [],
    voice_messages: init.voice_messages || [],
    chat_history: init.chat_history || [],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

async function createSession(sessionId, init = {}) {
  const doc = emptySessionShape(sessionId, init);

  const db = getDB();
  if (db) {
    try {
      await db.collection("sessions").insertOne({ ...doc });
    } catch (err) {
      // Duplicate key: join_code collision — retry with a new one
      if (err.code === 11000 && /join_code/.test(err.message || "")) {
        doc.join_code = makeJoinCode();
        await db.collection("sessions").insertOne({ ...doc });
      } else {
        throw err;
      }
    }
    const { _id, ...rest } = doc;
    return rest;
  }

  const data = readFile();
  // Avoid join_code collision in file mode too
  while (data.sessions.some((s) => s.join_code === doc.join_code)) {
    doc.join_code = makeJoinCode();
  }
  data.sessions.push(doc);
  writeFile(data);
  return doc;
}

async function getSession(sessionId) {
  const db = getDB();
  if (db) {
    const s = await db.collection("sessions").findOne({ session_id: sessionId }, { projection: { _id: 0 } });
    if (s) return s;
  }
  const data = readFile();
  return data.sessions.find((s) => s.session_id === sessionId) || null;
}

async function getSessionByJoinCode(joinCode) {
  const db = getDB();
  if (db) {
    const s = await db.collection("sessions").findOne({ join_code: String(joinCode) }, { projection: { _id: 0 } });
    if (s) return s;
  }
  const data = readFile();
  return data.sessions.find((s) => s.join_code === String(joinCode)) || null;
}

async function updateSession(sessionId, patch) {
  const db = getDB();
  const finalPatch = { ...patch, updated_at: new Date().toISOString() };

  if (db) {
    await db.collection("sessions").updateOne(
      { session_id: sessionId },
      { $set: finalPatch },
      { upsert: false }
    );
    return getSession(sessionId);
  }

  const data = readFile();
  const idx = data.sessions.findIndex((s) => s.session_id === sessionId);
  if (idx < 0) return null;
  data.sessions[idx] = { ...data.sessions[idx], ...finalPatch };
  writeFile(data);
  return data.sessions[idx];
}

async function ensureSession(sessionId, init = {}) {
  const existing = await getSession(sessionId);
  if (existing) return existing;
  return createSession(sessionId, init);
}

async function appendToArray(sessionId, field, entry, init = {}) {
  const db = getDB();
  const val = Array.isArray(entry) ? entry : [entry];

  // Ensure session exists first
  await ensureSession(sessionId, init);

  if (db) {
    await db.collection("sessions").updateOne(
      { session_id: sessionId },
      { $push: { [field]: { $each: val } }, $set: { updated_at: new Date().toISOString() } }
    );
    return getSession(sessionId);
  }

  const data = readFile();
  const idx = data.sessions.findIndex((s) => s.session_id === sessionId);
  if (idx < 0) return null;
  data.sessions[idx][field] = [...(data.sessions[idx][field] || []), ...val];
  data.sessions[idx].updated_at = new Date().toISOString();
  writeFile(data);
  return data.sessions[idx];
}

async function removeFromArray(sessionId, field, idField, idValue) {
  const db = getDB();

  if (db) {
    await db.collection("sessions").updateOne(
      { session_id: sessionId },
      { $pull: { [field]: { [idField]: idValue } }, $set: { updated_at: new Date().toISOString() } }
    );
    return getSession(sessionId);
  }

  const data = readFile();
  const idx = data.sessions.findIndex((s) => s.session_id === sessionId);
  if (idx < 0) return null;
  data.sessions[idx][field] = (data.sessions[idx][field] || []).filter((m) => m[idField] !== idValue);
  data.sessions[idx].updated_at = new Date().toISOString();
  writeFile(data);
  return data.sessions[idx];
}

async function listSessionsByDoctor(doctorId, limit = 20) {
  const db = getDB();
  if (db) {
    return db.collection("sessions")
      .find({ assigned_doctor_id: doctorId }, { projection: { _id: 0 } })
      .sort({ updated_at: -1 })
      .limit(limit)
      .toArray();
  }
  const data = readFile();
  return data.sessions
    .filter((s) => s.assigned_doctor_id === doctorId)
    .sort((a, b) => (b.updated_at || "").localeCompare(a.updated_at || ""))
    .slice(0, limit);
}

async function listSessionsByHospital(hospitalId, limit = 20) {
  const db = getDB();
  if (db) {
    return db.collection("sessions")
      .find({ hospital_id: hospitalId }, { projection: { _id: 0 } })
      .sort({ updated_at: -1 })
      .limit(limit)
      .toArray();
  }
  const data = readFile();
  return data.sessions
    .filter((s) => s.hospital_id === hospitalId)
    .sort((a, b) => (b.updated_at || "").localeCompare(a.updated_at || ""))
    .slice(0, limit);
}

module.exports = {
  createSession,
  getSession,
  getSessionByJoinCode,
  removeFromArray,
  updateSession,
  ensureSession,
  appendToArray,
  listSessionsByDoctor,
  listSessionsByHospital,
  makeJoinCode,
};
