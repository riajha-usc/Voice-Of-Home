#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const readline = require("readline");

const kbPath = path.resolve(__dirname, "../../shared/cultural-knowledge-base.json");
const KB = JSON.parse(fs.readFileSync(kbPath, "utf-8")).entries;

function searchKB(query, lang, limit = 5) {
  const q = query.toLowerCase();
  let results = lang ? KB.filter((e) => e.language_code === lang) : KB;
  const scored = results.map((entry) => {
    let score = 0;
    [entry.cultural_expression, entry.literal_translation, entry.clinical_mapping].forEach((f) => {
      if (f.toLowerCase().includes(q)) score += 10;
      q.split(/\s+/).forEach((w) => { if (w.length > 2 && f.toLowerCase().includes(w)) score += 3; });
    });
    if (entry.cultural_expression.toLowerCase() === q) score += 50;
    return { score, entry };
  });
  return scored.filter((s) => s.score > 0).sort((a, b) => b.score - a.score).slice(0, limit).map((s) => s.entry);
}

const TOOLS = [
  {
    name: "get_cultural_context",
    description: "Search the cultural medical knowledge base for symptom expressions and their clinical mappings. Returns ICD-10 codes, recommended screenings, and source citations.",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Cultural symptom expression or keyword to search for" },
        language_code: { type: "string", description: "ISO language code (es, vi, ht, hi, zh, ko, ar, fa, tl, hmn, so, am, pt)" },
      },
      required: ["query"],
    },
  },
  {
    name: "get_dietary_profile",
    description: "Get nutritional information and culturally-adapted hospital meal plan suggestions for dishes from specific cultural backgrounds.",
    inputSchema: {
      type: "object",
      properties: {
        dish_name: { type: "string", description: "Name of the dish to look up" },
        language_code: { type: "string", description: "Cultural context language code" },
      },
      required: ["dish_name"],
    },
  },
  {
    name: "get_care_translation",
    description: "Get simplified care instruction text suitable for translation and voice synthesis for patients with limited English proficiency.",
    inputSchema: {
      type: "object",
      properties: {
        text: { type: "string", description: "Medical care instruction text to simplify" },
        target_language: { type: "string", description: "Target language name (e.g., Vietnamese, Spanish)" },
        simplification_level: { type: "string", enum: ["basic", "detailed"], description: "Level of simplification" },
      },
      required: ["text"],
    },
  },
  {
    name: "list_supported_languages",
    description: "List all languages supported by the cultural medical knowledge base with entry counts.",
    inputSchema: { type: "object", properties: {} },
  },
];

const DIETARY_DB = {
  pho: { dish: "Ph\u1edf b\u00f2", english: "Vietnamese beef noodle soup", sodium_original: 1850, sodium_adapted: 980, adaptation: "Low-sodium broth, extra herbs, lean beef" },
  "arroz con pollo": { dish: "Arroz con pollo", english: "Rice with chicken", sodium_original: 1200, sodium_adapted: 750, adaptation: "Reduced salt sofrito, skinless chicken" },
  congee: { dish: "\u7ca5", english: "Rice porridge", sodium_original: 900, sodium_adapted: 600, adaptation: "Low-sodium broth, extra ginger" },
};

function handleToolCall(name, args) {
  if (name === "get_cultural_context") {
    const results = searchKB(args.query, args.language_code);
    if (results.length === 0) return { content: [{ type: "text", text: `No cultural matches found for "${args.query}"${args.language_code ? ` in language ${args.language_code}` : ""}.` }] };
    const text = results.map((r) =>
      `Expression: ${r.cultural_expression} (${r.language})\nLiteral: ${r.literal_translation}\nClinical: ${r.clinical_mapping}\nICD-10: ${r.icd10_codes.join(", ")}\nScreenings: ${r.recommended_screenings.join(", ")}\nConfidence: ${r.confidence_level}\nSource: ${r.source_citation}`
    ).join("\n\n---\n\n");
    return { content: [{ type: "text", text }] };
  }

  if (name === "get_dietary_profile") {
    const key = args.dish_name.toLowerCase();
    for (const [k, v] of Object.entries(DIETARY_DB)) {
      if (key.includes(k)) {
        return { content: [{ type: "text", text: `Dish: ${v.dish} (${v.english})\nOriginal sodium: ${v.sodium_original}mg\nAdapted sodium: ${v.sodium_adapted}mg\nAdaptation: ${v.adaptation}` }] };
      }
    }
    return { content: [{ type: "text", text: `Dish "${args.dish_name}" not found in dietary database. Available: pho, arroz con pollo, congee.` }] };
  }

  if (name === "get_care_translation") {
    const simplified = args.text
      .replace(/\b(administer|prescribe)\b/gi, "give")
      .replace(/\b(discontinue)\b/gi, "stop taking")
      .replace(/\b(prior to)\b/gi, "before")
      .replace(/\b(subsequent to)\b/gi, "after")
      .replace(/\b(approximately)\b/gi, "about")
      .replace(/\b(milligrams)\b/gi, "mg");
    return { content: [{ type: "text", text: `Simplified: ${simplified}\nTarget language: ${args.target_language || "not specified"}\nNote: Full translation requires care-model integration.` }] };
  }

  if (name === "list_supported_languages") {
    const langs = {};
    KB.forEach((e) => { langs[e.language_code] = langs[e.language_code] || { name: e.language, count: 0 }; langs[e.language_code].count++; });
    const text = Object.entries(langs).map(([code, info]) => `${code}: ${info.name} (${info.count} entries)`).join("\n");
    return { content: [{ type: "text", text: `Supported languages (${Object.keys(langs).length}):\n${text}` }] };
  }

  return { content: [{ type: "text", text: `Unknown tool: ${name}` }], isError: true };
}

function respond(id, result) {
  const msg = JSON.stringify({ jsonrpc: "2.0", id, result });
  process.stdout.write(msg + "\n");
}

function respondError(id, code, message) {
  const msg = JSON.stringify({ jsonrpc: "2.0", id, error: { code, message } });
  process.stdout.write(msg + "\n");
}

const rl = readline.createInterface({ input: process.stdin, terminal: false });
let buffer = "";

rl.on("line", (line) => {
  try {
    const req = JSON.parse(line);

    if (req.method === "initialize") {
      respond(req.id, {
        protocolVersion: "2024-11-05",
        capabilities: { tools: {} },
        serverInfo: { name: "voicesofhome-cultural-kb", version: "1.0.0" },
      });
    } else if (req.method === "tools/list") {
      respond(req.id, { tools: TOOLS });
    } else if (req.method === "tools/call") {
      const result = handleToolCall(req.params.name, req.params.arguments || {});
      respond(req.id, result);
    } else if (req.method === "notifications/initialized") {
    } else {
      respondError(req.id, -32601, `Method not found: ${req.method}`);
    }
  } catch (err) {
    respondError(null, -32700, `Parse error: ${err.message}`);
  }
});

process.stderr.write("Voices of Home MCP Server started. Waiting for JSON-RPC input...\n");
