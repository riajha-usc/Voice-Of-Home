const fs = require("fs");
const path = require("path");
const { connectDB, closeDB } = require("../../config/database");

async function seed() {
  console.log("[SeedHospitals] Loading hospitals + doctors...");

  const seedPath = path.resolve(__dirname, "../../../shared/hospitals-seed.json");
  const raw = fs.readFileSync(seedPath, "utf-8");
  const { hospitals, doctors } = JSON.parse(raw);

  const db = await connectDB();
  if (!db) {
    console.log("[SeedHospitals] No DB connection. Exiting.");
    console.log("[SeedHospitals] Set MONGODB_URI in .env to seed.");
    process.exit(0);
  }

  // Upsert hospitals
  let hospCount = 0;
  for (const h of hospitals) {
    await db.collection("hospitals").updateOne(
      { id: h.id },
      { $set: { ...h, updated_at: new Date() }, $setOnInsert: { created_at: new Date() } },
      { upsert: true }
    );
    hospCount++;
  }
  console.log(`[SeedHospitals] Upserted ${hospCount} hospitals.`);

  // Upsert doctors
  let docCount = 0;
  for (const d of doctors) {
    await db.collection("doctors").updateOne(
      { id: d.id },
      { $set: { ...d, updated_at: new Date() }, $setOnInsert: { created_at: new Date() } },
      { upsert: true }
    );
    docCount++;
  }
  console.log(`[SeedHospitals] Upserted ${docCount} doctors.`);

  await closeDB();
  console.log("[SeedHospitals] Done!");
}

seed().catch((err) => {
  console.error("[SeedHospitals] Error:", err);
  process.exit(1);
});
