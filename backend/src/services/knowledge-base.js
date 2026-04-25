
const fs = require("fs");
const path = require("path");
const { getDB } = require("../../config/database");

let entries = null;

// -----------------------------------------------------------------------------
// Atlas Vector Search
//
// Uses MongoDB Atlas Vector Search ($vectorSearch aggregation) over the
// `cultural_knowledge` collection. The collection is seeded with 768-d
// embeddings from Gemini text-embedding-004 by `seed-knowledge-base.js`.
//
// Atlas index expected (create in Atlas UI under Search > Vector Search):
//   {
//     "fields": [
//       { "type": "vector", "path": "embedding", "numDimensions": 768, "similarity": "cosine" },
//       { "type": "filter", "path": "language_code" }
//     ]
//   }
//   Index name: "cultural_kb_vector"
//
// Falls back gracefully:
//   - If Atlas is not connected → returns null (caller falls back to in-memory)
//   - If embeddings can't be generated → returns null
//   - If $vectorSearch fails (index missing) → returns null with a helpful warning
// -----------------------------------------------------------------------------

const VECTOR_INDEX = process.env.ATLAS_VECTOR_INDEX || "cultural_kb_vector";

let warnedNoIndex = false;

async function generateQueryEmbedding(text) {
  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey || apiKey === "your_gemini_api_key") return null;
  try {
    const { GoogleGenerativeAI } = require("@google/generative-ai");
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "text-embedding-004" });
    const result = await model.embedContent(text);
    return result.embedding.values;
  } catch (err) {
    if (!err.message?.includes("429")) {
      console.warn("[KnowledgeBase] embedding generation failed:", err.message);
    }
    return null;
  }
}

async function vectorSearch(query, languageCode = null, limit = 5) {
  const db = getDB();
  if (!db) return null;

  const queryVec = await generateQueryEmbedding(query);
  if (!queryVec) return null;

  const filter = languageCode ? { language_code: languageCode } : undefined;

  try {
    const pipeline = [
      {
        $vectorSearch: {
          index: VECTOR_INDEX,
          path: "embedding",
          queryVector: queryVec,
          numCandidates: 60,
          limit,
          ...(filter ? { filter } : {}),
        },
      },
      {
        $project: {
          _id: 0,
          embedding: 0,
          search_text: 0,
          score: { $meta: "vectorSearchScore" },
        },
      },
    ];

    const results = await db.collection("cultural_knowledge").aggregate(pipeline).toArray();
    return results.map((r) => ({ ...r, _vector_score: r.score }));
  } catch (err) {
    if (!warnedNoIndex) {
      warnedNoIndex = true;
      console.warn(`[KnowledgeBase] $vectorSearch failed (index '${VECTOR_INDEX}' may not exist). Create it in Atlas. Falling back to in-memory.`, err.message);
    }
    return null;
  }
}

function loadKnowledgeBase() {
  if (entries) return entries;

  const kbPath = path.resolve(__dirname, "../../../shared/cultural-knowledge-base.json");
  const raw = fs.readFileSync(kbPath, "utf-8");
  const kb = JSON.parse(raw);
  entries = kb.entries;

  console.log(`[KnowledgeBase] Loaded ${entries.length} entries from JSON (in-memory mode).`);
  return entries;
}

function searchKnowledgeBase(query, languageCode = null, limit = 5) {
  const kb = loadKnowledgeBase();
  const queryLower = query.toLowerCase();

  let results = kb;

  if (languageCode) {
    results = results.filter((e) => e.language_code === languageCode);
  }

  const scored = results.map((entry) => {
    let score = 0;
    const fields = [
      entry.cultural_expression,
      entry.literal_translation,
      entry.clinical_mapping,
      entry.language,
    ];

    for (const field of fields) {
      const fieldLower = field.toLowerCase();
      if (fieldLower.includes(queryLower)) score += 10;

      const queryWords = queryLower.split(/\s+/);
      for (const word of queryWords) {
        if (word.length > 2 && fieldLower.includes(word)) score += 3;
      }
    }

    if (entry.cultural_expression.toLowerCase() === queryLower) score += 50;

    return { ...entry, _score: score };
  });

  return scored
    .filter((e) => e._score > 0)
    .sort((a, b) => b._score - a._score)
    .slice(0, limit)
    .map(({ _score, ...entry }) => entry);
}

function getByLanguage(languageCode) {
  const kb = loadKnowledgeBase();
  return kb.filter((e) => e.language_code === languageCode);
}

function getById(id) {
  const kb = loadKnowledgeBase();
  return kb.find((e) => e.id === id) || null;
}

function getLanguages() {
  const kb = loadKnowledgeBase();
  const langs = new Map();
  for (const entry of kb) {
    if (!langs.has(entry.language_code)) {
      langs.set(entry.language_code, {
        code: entry.language_code,
        name: entry.language,
        entry_count: 0,
      });
    }
    langs.get(entry.language_code).entry_count++;
  }
  return Array.from(langs.values());
}

module.exports = {
  loadKnowledgeBase,
  searchKnowledgeBase,
  vectorSearch,
  getByLanguage,
  getById,
  getLanguages,
};
