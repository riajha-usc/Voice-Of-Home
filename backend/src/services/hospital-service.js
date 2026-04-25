const fs = require("fs");
const path = require("path");
const { getDB } = require("../../config/database");

let cache = null;

function loadSeedCache() {
  if (cache) return cache;
  const seedPath = path.resolve(__dirname, "../../../shared/hospitals-seed.json");
  const raw = fs.readFileSync(seedPath, "utf-8");
  cache = JSON.parse(raw);
  return cache;
}

async function listHospitals() {
  const db = getDB();
  if (db) {
    const arr = await db.collection("hospitals").find({}, { projection: { _id: 0 } }).sort({ name: 1 }).toArray();
    if (arr.length > 0) return arr;
  }
  return loadSeedCache().hospitals;
}

async function getHospital(id) {
  const db = getDB();
  if (db) {
    const h = await db.collection("hospitals").findOne({ id }, { projection: { _id: 0 } });
    if (h) return h;
  }
  return loadSeedCache().hospitals.find((h) => h.id === id) || null;
}

async function listDoctors(hospitalId = null) {
  const db = getDB();
  const filter = hospitalId ? { hospital_id: hospitalId } : {};

  if (db) {
    const arr = await db.collection("doctors").find(filter, { projection: { _id: 0 } }).sort({ name: 1 }).toArray();
    if (arr.length > 0) return arr;
  }

  const { doctors } = loadSeedCache();
  return hospitalId ? doctors.filter((d) => d.hospital_id === hospitalId) : doctors;
}

async function getDoctor(id) {
  const db = getDB();
  if (db) {
    const d = await db.collection("doctors").findOne({ id }, { projection: { _id: 0 } });
    if (d) return d;
  }
  return loadSeedCache().doctors.find((d) => d.id === id) || null;
}

module.exports = {
  listHospitals,
  getHospital,
  listDoctors,
  getDoctor,
};
