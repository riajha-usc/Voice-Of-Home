
const fs = require("fs");
const path = require("path");
const { connectDB, closeDB } = require("../config/database");

async function generateEmbedding(text) {
  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey || apiKey === "your_gemini_api_key") {
    return null; // Skip embeddings, will use text search fallback
  }

  try {
    const { GoogleGenerativeAI } = require("@google/generative-ai");
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "text-embedding-004" });
    const result = await model.embedContent(text);
    return result.embedding.values;
  } catch (err) {
    console.warn(`[Seed] Embedding failed for: ${text.substring(0, 40)}... - ${err.message}`);
    return null;
  }
}

async function seed() {
  console.log("[Seed] Loading cultural knowledge base...");

  const kbPath = path.resolve(__dirname, "../../../shared/cultural-knowledge-base.json");
  const raw = fs.readFileSync(kbPath, "utf-8");
  const kb = JSON.parse(raw);

  console.log(`[Seed] Found ${kb.entries.length} entries.`);

  const db = await connectDB();
  if (!db) {
    console.log("[Seed] No database connection. Exiting.");
    console.log("[Seed] Set MONGODB_URI in .env to seed the database.");
    process.exit(0);
  }

  const collection = db.collection("cultural_knowledge");

  await collection.deleteMany({});
  console.log("[Seed] Cleared existing entries.");

  let embeddingCount = 0;
  for (const entry of kb.entries) {
    const embeddingText = `${entry.language} ${entry.cultural_expression} ${entry.literal_translation} ${entry.clinical_mapping}`;
    const embedding = await generateEmbedding(embeddingText);

    if (embedding) embeddingCount++;

    await collection.insertOne({
      ...entry,
      embedding,
      search_text: embeddingText.toLowerCase(),
      created_at: new Date(),
    });
  }

  console.log(`[Seed] Inserted ${kb.entries.length} entries.`);
  console.log(`[Seed] Generated ${embeddingCount} embeddings (${kb.entries.length - embeddingCount} without - will use text search fallback).`);

  await collection.createIndex({ search_text: "text", cultural_expression: "text", literal_translation: "text", clinical_mapping: "text" });
  console.log("[Seed] Created text search index.");

  await closeDB();
  console.log("[Seed] Done!");
}

seed().catch((err) => {
  console.error("[Seed] Error:", err);
  process.exit(1);
});
