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

// ─── Response schema: question generation ────────────────────────────────────
// Schema: array of objects each containing a single "question" string.

const QUESTION_RESPONSE_SCHEMA = {
  type: SchemaType.ARRAY,
  items: {
    type: SchemaType.OBJECT,
    properties: {
      question: { type: SchemaType.STRING },
    },
    required: ["question"],
  },
};

// ─── Response schema: answer evaluation ──────────────────────────────────────
// Schema: a single object matching the EvaluationResult shape.
// The API enforces this server-side — malformed responses are rejected before
// they reach our parser.

const EVALUATION_RESPONSE_SCHEMA = {
  type: SchemaType.OBJECT,
  properties: {
    score:       { type: SchemaType.NUMBER },
    strengths:   { type: SchemaType.ARRAY,  items: { type: SchemaType.STRING } },
    weaknesses:  { type: SchemaType.ARRAY,  items: { type: SchemaType.STRING } },
    suggestions: { type: SchemaType.ARRAY,  items: { type: SchemaType.STRING } },
    idealAnswer: { type: SchemaType.STRING },
  },
  required: ["score", "strengths", "weaknesses", "suggestions", "idealAnswer"],
};

// ─── Generation config: question generation ───────────────────────────────────
// temperature 0.7 → enough creativity to vary questions between sessions while
// still staying factually grounded.

const QUESTION_GENERATION_CONFIG = {
  temperature:      0.7,
  topP:             0.9,
  topK:             40,
  maxOutputTokens:  2048,
  responseMimeType: "application/json",
  responseSchema:   QUESTION_RESPONSE_SCHEMA,
};

// ─── Generation config: answer evaluation ────────────────────────────────────
// temperature 0.2 → evaluations must be consistent and objective.
// Higher temperature risks the same answer getting wildly different scores
// on different runs, which would undermine user trust.

const EVALUATION_GENERATION_CONFIG = {
  temperature:      0.2,
  topP:             0.8,
  topK:             20,
  maxOutputTokens:  2048,
  responseMimeType: "application/json",
  responseSchema:   EVALUATION_RESPONSE_SCHEMA,
};

// ─── Model factory ────────────────────────────────────────────────────────────

/**
 * Returns a model instance configured for question generation.
 * @returns {import("@google/generative-ai").GenerativeModel | null}
 */
const getGeminiModel = () => {
  if (!genAI) return null;
  return genAI.getGenerativeModel({
    model:            "gemini-2.5-flash",
    generationConfig: QUESTION_GENERATION_CONFIG,
    safetySettings:   SAFETY_SETTINGS,
  });
};

/**
 * Returns a model instance configured for answer evaluation.
 * Uses lower temperature (0.2) for consistent, objective scoring.
 * @returns {import("@google/generative-ai").GenerativeModel | null}
 */
const getEvaluationModel = () => {
  if (!genAI) return null;
  return genAI.getGenerativeModel({
    model:            "gemini-2.5-flash",
    generationConfig: EVALUATION_GENERATION_CONFIG,
    safetySettings:   SAFETY_SETTINGS,
  });
};

/**
 * Returns whether the Gemini client is ready to make requests.
 * @returns {boolean}
 */
const isAiConfigured = () => genAI !== null;

module.exports = { getGeminiModel, getEvaluationModel, isAiConfigured };
