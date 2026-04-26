// Mental health service — pattern lookup over the personas JSON.
//
// This is a deliberately simple matcher today. To finish the vector DB path,
// the remaining work is:
//   1. Add the cleaned dataset at shared/datasets/mental-health-cleaned.json
//   2. Embed each row's `narrative` field
//   3. Store rows in MongoDB collection `mental_health_records`
//   4. Use $vectorSearch over that collection for semantic pattern lookup
//
// For now, it does substring scoring against the persona phrases. Same
// interface — when the dataset is wired, only this service changes.

const fs = require("fs");
const path = require("path");

let personasCache = null;

function loadPersonas() {
  if (personasCache) return personasCache;
  const p = path.resolve(__dirname, "../../../shared/mental-health-personas.json");
  personasCache = JSON.parse(fs.readFileSync(p, "utf-8"));
  return personasCache;
}

function getPersonas() {
  return loadPersonas().personas;
}

function datasetStats() {
  const data = loadPersonas();
  return {
    ...data._dataset_meta,
    persona_count: data.personas.length,
    note: "Pattern lookup currently runs against persona phrases. Remaining vector DB work: add the cleaned dataset, generate embeddings, store them in mental_health_records, and create Atlas Vector Search for semantic lookup.",
  };
}

async function matchPattern(text, topK = 3) {
  const personas = getPersonas();
  const lower = (text || "").toLowerCase();

  const scored = personas.map((p) => {
    let score = 0;
    for (const phrase of p.common_phrases || []) {
      const ph = phrase.toLowerCase();
      if (lower.includes(ph)) score += 25;
      // Word-level overlap for partial matches
      const phWords = ph.split(/\W+/).filter((w) => w.length > 3);
      for (const w of phWords) {
        if (lower.includes(w)) score += 2;
      }
    }
    for (const pat of p.underlying_patterns || []) {
      if (lower.includes(pat.replace(/_/g, " "))) score += 6;
    }
    if (lower.includes((p.title || "").split("—")[0].toLowerCase().trim())) score += 5;

    return { ...p, _score: score };
  });

  return scored
    .filter((p) => p._score > 0)
    .sort((a, b) => b._score - a._score)
    .slice(0, topK)
    .map(({ _score, ...rest }) => ({ ...rest, match_score: _score }));
}

module.exports = {
  loadPersonas,
  getPersonas,
  datasetStats,
  matchPattern,
};
