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

module.exports = { parseGeminiQuestions };
