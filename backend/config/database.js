const { MongoClient } = require("mongodb");
require("dotenv").config({ path: require("path").resolve(__dirname, "../../.env") });

let client = null;
let db = null;

const REQUIRED_COLLECTIONS = [
  "cultural_knowledge",
  "pending_expressions",
  "sessions",
  "care_circles",
  "hospitals",
  "doctors",
  "patients",
];

async function connectDB() {
  if (db) return db;

  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.warn("[MongoDB] MONGODB_URI not set. Using file-backed fallback (data will not persist across server restarts in the same way, but sessions persist to disk).");
    return null;
  }

  try {
    client = new MongoClient(uri);
    await client.connect();
    db = client.db("voicesofhome");
    console.log("[MongoDB] Connected to Atlas successfully.");

    const collections = await db.listCollections().toArray();
    const names = collections.map((c) => c.name);

    for (const col of REQUIRED_COLLECTIONS) {
      if (!names.includes(col)) {
        await db.createCollection(col);
        console.log(`[MongoDB] Created '${col}' collection.`);
      }
    }

    // Indexes
    await db.collection("sessions").createIndex({ session_id: 1 }, { unique: true });
    await db.collection("sessions").createIndex({ join_code: 1 }, { unique: true, sparse: true });
    await db.collection("sessions").createIndex({ patient_id: 1 });
    await db.collection("sessions").createIndex({ updated_at: -1 });
    await db.collection("patients").createIndex({ mrn: 1 }, { unique: true });
    await db.collection("patients").createIndex({ hospital_id: 1 });
    await db.collection("doctors").createIndex({ hospital_id: 1 });
    await db.collection("hospitals").createIndex({ id: 1 }, { unique: true });
    await db.collection("doctors").createIndex({ id: 1 }, { unique: true });

    return db;
  } catch (err) {
    console.error("[MongoDB] Connection failed:", err.message);
    return null;
  }
}

function getDB() {
  return db;
}

async function closeDB() {
  if (client) {
    await client.close();
    client = null;
    db = null;
    console.log("[MongoDB] Connection closed.");
  }
}

module.exports = { connectDB, getDB, closeDB };
