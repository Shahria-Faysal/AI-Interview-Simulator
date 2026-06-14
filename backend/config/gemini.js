/**
 * config/gemini.js
 * Initialises and exports a shared Google Gemini client.
 *
 * Design decisions:
 *  - Singleton model instance: one object created at startup, reused on every
 *    request. The SDK is stateless between calls, so this is safe and avoids
 *    re-parsing the API key on each request.
 *  - Fail-fast on missing key: if GEMINI_API_KEY is absent we log a clear
 *    warning rather than crashing, because the fallback question bank will
 *    keep the app alive. A hard throw here would kill the entire process even
 *    for users who haven't set up AI yet.
 *  - Model choice: gemini-1.5-flash is fast and cheap — ideal for structured
 *    JSON generation where latency matters more than response length.
 *  - Safety settings: lowered for technical content so that questions about
 *    security vulnerabilities, injection attacks, etc. are not blocked.
 */

const { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold, SchemaType } = require("@google/generative-ai");

// ─── Validation ───────────────────────────────────────────────────────────────

if (!process.env.GEMINI_API_KEY) {
  console.warn(
    "⚠️  [Gemini] GEMINI_API_KEY is not set. " +
    "AI question generation will fall back to the hardcoded question bank."
  );
}

// ─── Client ───────────────────────────────────────────────────────────────────

const genAI = process.env.GEMINI_API_KEY
  ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
  : null;

// ─── Safety settings ─────────────────────────────────────────────────────────
// Block only content that is clearly harmful. Technical interview questions
// often mention topics (e.g. SQL injection, XSS, buffer overflows) that would
// otherwise be flagged at the default MEDIUM threshold.

const SAFETY_SETTINGS = [
  { category: HarmCategory.HARM_CATEGORY_HARASSMENT,        threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
  { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,       threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
  { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
  { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
];

// ─── Response schema ──────────────────────────────────────────────────────────
// Pairing responseMimeType with responseSchema gives the model a contract it
// must satisfy. The API enforces the schema server-side, dramatically reducing
// the rate of malformed responses that need parser-level recovery.
//
// Schema: array of objects each containing a single "question" string.

const RESPONSE_SCHEMA = {
  type: SchemaType.ARRAY,
  items: {
    type: SchemaType.OBJECT,
    properties: {
      question: { type: SchemaType.STRING },
    },
    required: ["question"],
  },
};

// ─── Generation config ────────────────────────────────────────────────────────
// temperature 0.7 → enough creativity to vary questions between sessions while
// still staying factually grounded.
// responseMimeType + responseSchema: two-layer JSON enforcement.
//   - responseMimeType tells the model to skip markdown fences.
//   - responseSchema tells the API to validate the output structure.

const GENERATION_CONFIG = {
  temperature:      0.7,
  topP:             0.9,
  topK:             40,
  maxOutputTokens:  2048,
  responseMimeType: "application/json",
  responseSchema:   RESPONSE_SCHEMA,
};

// ─── Model factory ────────────────────────────────────────────────────────────

/**
 * Returns a configured GenerativeModel instance, or null if the API key is absent.
 * @returns {import("@google/generative-ai").GenerativeModel | null}
 */
const getGeminiModel = () => {
  if (!genAI) return null;

  return genAI.getGenerativeModel({
    model:            "gemini-1.5-flash",
    generationConfig: GENERATION_CONFIG,
    safetySettings:   SAFETY_SETTINGS,
  });
};

/**
 * Returns whether the Gemini client is ready to make requests.
 * Used by the /api/health endpoint so operators can verify AI status.
 * @returns {boolean}
 */
const isAiConfigured = () => genAI !== null;

module.exports = { getGeminiModel, isAiConfigured };
