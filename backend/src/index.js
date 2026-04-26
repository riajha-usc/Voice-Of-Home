const express = require("express");
const cors = require("cors");
const path = require("path");

// Only load dotenv if we are NOT in production
if (process.env.NODE_ENV !== 'production') {
  require("dotenv").config({ path: path.resolve(__dirname, "../../.env") });
}

const { connectDB } = require("../config/database");
const { initGemini } = require("./services/gemini-service");
const { initClaude } = require("./services/claude-service");
const { initCloudinary } = require("./services/cloudinary-service");
const apiRoutes = require("./routes/api");

const app = express();
const PORT = process.env.PORT || 3001;

const frontendUrl = process.env.FRONTEND_URL;
app.use(cors({ 
  origin: frontendUrl, 
  credentials: true 
}));
console.log(`  CORS enabled for: ${frontendUrl}`);
app.use(express.json({ limit: "10mb" }));

app.use("/audio", express.static(path.join(__dirname, "../audio")));

app.use("/api", apiRoutes);

app.get("/", (req, res) => {
  res.json({
    name: "Voices of Home API",
    version: "1.0.0",
    tagline: "We do not translate words. We translate worlds.",
    docs: "/api/health",
  });
});

async function start() {
  console.log("\n========================================");
  console.log("  VOICES OF HOME - Backend Server");
  console.log("  LA Hacks 2026");
  console.log("========================================\n");

  const geminiReady = initGemini();
  const claudeReady = initClaude();
  const cloudinaryReady = initCloudinary();
  const dbReady = await connectDB();

  console.log("\n--- Service Status ---");
  console.log(`  Care model: ${geminiReady ? "READY" : "MOCK MODE (set GOOGLE_API_KEY)"}`);
  console.log(`  Chat (ASI): ${claudeReady ? "READY" : "MOCK MODE (set ASI_ONE_API_KEY)"}`);
  console.log(`  MongoDB:    ${dbReady ? "CONNECTED" : "IN-MEMORY (set MONGODB_URI)"}`);
  console.log(`  ElevenLabs: ${process.env.ELEVENLABS_API_KEY && process.env.ELEVENLABS_API_KEY !== "your_elevenlabs_api_key" ? "READY" : "MOCK MODE (set ELEVENLABS_API_KEY)"}`);
  console.log(`  Cloudinary: ${cloudinaryReady ? "READY" : "PASSTHROUGH (set CLOUDINARY_* vars)"}`);
  console.log("----------------------\n");

  app.listen(PORT, () => {
    console.log(`  Server running at http://localhost:${PORT}`);
    console.log(`  Health check: http://localhost:${PORT}/api/health`);
    console.log(`  Knowledge base: http://localhost:${PORT}/api/knowledge/languages`);
    console.log(`\n  Ready to translate worlds.\n`);
  });
}

start().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
