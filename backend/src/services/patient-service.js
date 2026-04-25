const fs = require("fs");
const path = require("path");
const { getDB } = require("../../config/database");

// File-backed fallback when MongoDB is not configured.
const DATA_DIR = path.resolve(__dirname, "../../.data");
const PATIENTS_FILE = path.join(DATA_DIR, "patients.json");

function ensureDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(PATIENTS_FILE)) fs.writeFileSync(PATIENTS_FILE, JSON.stringify({ patients: [] }, null, 2));
}

function readFile() {
  ensureDir();
  return JSON.parse(fs.readFileSync(PATIENTS_FILE, "utf-8"));
}

function writeFile(data) {
  ensureDir();
  fs.writeFileSync(PATIENTS_FILE, JSON.stringify(data, null, 2));
}

function makeMRN() {
  // Realistic-looking MRN: 8 digits
  return String(Math.floor(10000000 + Math.random() * 90000000));
}

async function createPatient(input) {
  const patient = {
    id: "pat_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    mrn: input.mrn || makeMRN(),
    first_name: input.first_name,
    last_name: input.last_name,
    dob: input.dob || null,
    sex: input.sex || null,
    language_code: input.language_code,
    language_name: input.language_name,
    hospital_id: input.hospital_id,
    assigned_doctor_id: input.assigned_doctor_id,
    room: input.room || null,
    admission_date: input.admission_date || new Date().toISOString(),
    conditions: input.conditions || [],
    medications: input.medications || [],
    allergies: input.allergies || [],
    dietary_restrictions: input.dietary_restrictions || [],
    emergency_contact: input.emergency_contact || null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const db = getDB();
  if (db) {
    await db.collection("patients").insertOne({ ...patient });
    const { _id, ...p } = patient;
    return p;
  }

  const data = readFile();
  data.patients.push(patient);
  writeFile(data);
  return patient;
}

async function getPatient(idOrMrn) {
  const db = getDB();
  if (db) {
    const p = await db.collection("patients").findOne(
      { $or: [{ id: idOrMrn }, { mrn: idOrMrn }] },
      { projection: { _id: 0 } }
    );
    if (p) return p;
  }
  const data = readFile();
  return data.patients.find((p) => p.id === idOrMrn || p.mrn === idOrMrn) || null;
}

async function updatePatient(id, updates) {
  const db = getDB();
  const patch = { ...updates, updated_at: new Date().toISOString() };

  if (db) {
    await db.collection("patients").updateOne({ id }, { $set: patch });
    return getPatient(id);
  }

  const data = readFile();
  const idx = data.patients.findIndex((p) => p.id === id);
  if (idx < 0) return null;
  data.patients[idx] = { ...data.patients[idx], ...patch };
  writeFile(data);
  return data.patients[idx];
}

async function listPatientsByHospital(hospitalId) {
  const db = getDB();
  if (db) {
    return db.collection("patients")
      .find({ hospital_id: hospitalId }, { projection: { _id: 0 } })
      .sort({ admission_date: -1 })
      .toArray();
  }
  const data = readFile();
  return data.patients
    .filter((p) => p.hospital_id === hospitalId)
    .sort((a, b) => (b.admission_date || "").localeCompare(a.admission_date || ""));
}

async function listPatientsByDoctor(doctorId) {
  const db = getDB();
  if (db) {
    return db.collection("patients")
      .find({ assigned_doctor_id: doctorId }, { projection: { _id: 0 } })
      .sort({ admission_date: -1 })
      .toArray();
  }
  const data = readFile();
  return data.patients
    .filter((p) => p.assigned_doctor_id === doctorId)
    .sort((a, b) => (b.admission_date || "").localeCompare(a.admission_date || ""));
}

module.exports = {
  createPatient,
  getPatient,
  updatePatient,
  listPatientsByHospital,
  listPatientsByDoctor,
  makeMRN,
};
