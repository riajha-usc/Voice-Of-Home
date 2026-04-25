
const fs = require("fs");
const path = require("path");

let entries = null;

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
  getByLanguage,
  getById,
  getLanguages,
};
