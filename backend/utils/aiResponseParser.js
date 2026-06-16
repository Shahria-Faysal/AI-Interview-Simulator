/**
 * utils/aiResponseParser.js
 * Utilities for safely parsing and validating Gemini's JSON responses.
 *
 * Gemini is instructed to return raw JSON, but can occasionally:
 *  - Wrap output in markdown code fences (```json ... ```)
 *  - Add a brief preamble before the JSON array
 *  - Return an object instead of an array ({ questions: [...] })
 *  - Return malformed JSON on safety blocks or network hiccups
 *
 * These helpers handle every known edge case so the AI service never
 * has to do raw JSON.parse() calls.
 */

const logger = require("./logger");

// ─── Constants ────────────────────────────────────────────────────────────────

// A valid question object must have a non-empty string "question" property.
const MIN_QUESTION_LENGTH = 10; // characters
const MAX_QUESTION_LENGTH = 800;

// ─── Step 1: Strip markdown fences and stray whitespace ──────────────────────

/**
 * Removes common wrapping that Gemini adds despite being told not to:
 *  - ```json ... ```
 *  - ```       ... ```
 *  - Leading/trailing whitespace and newlines
 *
 * @param {string} raw - Raw text from Gemini
 * @returns {string}   - Text with fences stripped
 */
const stripMarkdownFences = (raw) => {
  return raw
    .trim()
    .replace(/^```(?:json)?\s*/i, "")  // opening fence
    .replace(/\s*```\s*$/,        "")  // closing fence
    .trim();
};

// ─── Step 2: Extract JSON array from response ─────────────────────────────────

/**
 * Attempts to locate and extract a JSON array from a text string.
 * Handles cases where Gemini prepends a sentence before the JSON.
 *
 * @param {string} text
 * @returns {string} The JSON substring starting at [ and ending at ]
 * @throws {Error} If no array can be found
 */
const extractJsonArray = (text) => {
  const start = text.indexOf("[");
  const end   = text.lastIndexOf("]");

  if (start === -1 || end === -1 || end <= start) {
    throw new Error("No JSON array found in Gemini response.");
  }

  return text.slice(start, end + 1);
};

// ─── Step 3: Normalise parsed data into a flat array of question strings ─────

/**
 * Accepts whatever shape Gemini returned and normalises it to
 * Array<{ question: string }>.
 *
 * Handles:
 *  - Array<{ question: string }>   ← expected format
 *  - Array<string>                 ← Gemini sometimes returns bare strings
 *  - { questions: [...] }          ← Gemini sometimes wraps in an object
 *
 * @param {unknown} parsed
 * @returns {Array<{ question: string }>}
 * @throws {Error} If the shape cannot be normalised
 */
const normaliseQuestions = (parsed) => {
  let arr = parsed;

  // Unwrap { questions: [...] } or { data: [...] }
  if (arr && !Array.isArray(arr) && typeof arr === "object") {
    arr = arr.questions ?? arr.data ?? arr.items ?? Object.values(arr)[0];
  }

  if (!Array.isArray(arr)) {
    throw new Error(`Expected an array, got ${typeof arr}.`);
  }

  return arr
    .map((item) => {
      if (typeof item === "string") return { question: item.trim() };
      if (item && typeof item.question === "string") return { question: item.question.trim() };
      return null;
    })
    .filter(Boolean);
};

// ─── Step 4: Validate individual question objects ────────────────────────────

/**
 * Filters out question objects that are empty, too short, or too long.
 *
 * @param {Array<{ question: string }>} questions
 * @returns {Array<{ question: string }>}
 */
const filterValidQuestions = (questions) => {
  return questions.filter(({ question }) => {
    if (typeof question !== "string")             return false;
    const q = question.trim();
    if (q.length < MIN_QUESTION_LENGTH)           return false;
    if (q.length > MAX_QUESTION_LENGTH)           return false;
    // Reject items that look like they're just numbering (e.g. "1.", "Q1:")
    if (/^[\d]+\.?\s*$/.test(q))                 return false;
    return true;
  });
};

// ─── Main export ─────────────────────────────────────────────────────────────

/**
 * Full parsing pipeline: strip → extract → parse → normalise → validate.
 *
 * @param {string} rawText  - Raw text response from Gemini
 * @param {number} expected - Expected number of questions (for logging)
 * @returns {{ questions: Array<{ question: string }>, valid: boolean, count: number }}
 */
const parseGeminiQuestions = (rawText, expected) => {
  try {
    const stripped   = stripMarkdownFences(rawText);
    const jsonString = extractJsonArray(stripped);
    const parsed     = JSON.parse(jsonString);
    const normalised = normaliseQuestions(parsed);
    const questions  = filterValidQuestions(normalised);

    if (questions.length === 0) {
      throw new Error("All parsed questions failed validation.");
    }

    if (questions.length < expected) {
      logger.warn(
        `[AI Parser] Got ${questions.length}/${expected} valid questions after filtering. ` +
        `Session will proceed with ${questions.length} questions.`
      );
    }

    return { questions, valid: true, count: questions.length };
  } catch (error) {
    logger.error("[AI Parser] Failed to parse Gemini response:", {
      error:   error.message,
      rawText: rawText?.slice(0, 300),
    });
    return { questions: [], valid: false, count: 0, error: error.message };
  }
};

// ─── Evaluation response parser ──────────────────────────────────────────────

/**
 * The null/fallback evaluation returned when Gemini fails or the answer is empty.
 * Matches the shape the frontend and DB expect.
 */
const FALLBACK_EVALUATION = {
  score:       null,
  strengths:   [],
  weaknesses:  [],
  suggestions: [],
  idealAnswer: null,
};

/**
 * Validates and normalises a parsed evaluation object.
 * Accepts the object Gemini should return and defensively coerces every field
 * so downstream code never has to guard against unexpected types.
 *
 * @param {unknown} parsed
 * @returns {{ valid: boolean, evaluation: EvaluationResult }}
 */
const normaliseEvaluation = (parsed) => {
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    return { valid: false, evaluation: FALLBACK_EVALUATION };
  }

  // Score: must be a number 0–10
  const rawScore = parsed.score;
  const score = typeof rawScore === "number" && rawScore >= 0 && rawScore <= 10
    ? Math.round(rawScore * 10) / 10  // round to 1 dp
    : null;

  if (score === null) {
    return { valid: false, evaluation: FALLBACK_EVALUATION };
  }

  // Array fields: coerce anything that isn't a string[] into one
  const toStringArray = (val) => {
    if (!Array.isArray(val)) return [];
    return val
      .filter((v) => typeof v === "string" && v.trim().length > 0)
      .map((v) => v.trim());
  };

  const strengths   = toStringArray(parsed.strengths);
  const weaknesses  = toStringArray(parsed.weaknesses);
  const suggestions = toStringArray(parsed.suggestions);
  const idealAnswer = typeof parsed.idealAnswer === "string" && parsed.idealAnswer.trim().length > 0
    ? parsed.idealAnswer.trim()
    : null;

  const evaluation = { score, strengths, weaknesses, suggestions, idealAnswer };
  return { valid: true, evaluation };
};

/**
 * Full parsing pipeline for evaluation responses.
 * strip → extract object → parse → normalise → validate
 *
 * @param {string} rawText - Raw text response from Gemini
 * @returns {{ evaluation: EvaluationResult, valid: boolean }}
 */
const parseEvaluationResponse = (rawText) => {
  try {
    const stripped = stripMarkdownFences(rawText);

    // Evaluation returns an object, not an array — find { ... }
    const objStart = stripped.indexOf("{");
    const objEnd   = stripped.lastIndexOf("}");

    if (objStart === -1 || objEnd === -1 || objEnd <= objStart) {
      throw new Error("No JSON object found in evaluation response.");
    }

    const jsonString = stripped.slice(objStart, objEnd + 1);
    const parsed     = JSON.parse(jsonString);
    const { valid, evaluation } = normaliseEvaluation(parsed);

    if (!valid) {
      throw new Error("Evaluation object failed schema validation.");
    }

    return { evaluation, valid: true };
  } catch (error) {
    logger.error("[AI Parser] Failed to parse evaluation response", {
      error:   error.message,
      rawText: rawText?.slice(0, 300),
    });
    return { evaluation: FALLBACK_EVALUATION, valid: false };
  }
};

module.exports = { parseGeminiQuestions, parseEvaluationResponse, FALLBACK_EVALUATION };

