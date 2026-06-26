/**
 * services/aiService.js
 * Core AI question-generation service.
 *
 * Architecture:
 *  generateInterviewQuestions(role, difficulty)
 *    └─ tryGeminiGeneration()     ← primary path
 *         ├─ success → return questions
 *         └─ failure → fallbackToQuestionBank()   ← safety net
 *
 *  generatePersonalizedQuestions(role, difficulty, resumeAnalysis)  [Phase 5]
 *    └─ tryPersonalizedGeneration()  ← primary path (resume-aware)
 *         └─ failure → generateInterviewQuestions()  ← falls back to generic
 *
 * Key guarantees:
 *  1. Never throws to the caller — always resolves with questions.
 *  2. Questions are generated fresh each session (Gemini varies on temp 0.7).
 *  3. If the API key is missing or Gemini returns garbage, the hardcoded
 *     question bank is used transparently.
 *  4. A 15-second timeout prevents Gemini from hanging a session creation.
 *  5. All outcomes are logged for observability.
 */

const { getGeminiModel }                           = require("../config/gemini");
const { buildQuestionPrompt, buildPersonalizedQuestionPrompt, DIFFICULTY_CONFIG } = require("../config/prompts");
const { parseGeminiQuestions }                     = require("../utils/aiResponseParser");
const { getQuestionsForSession }                   = require("./questionBank.service");
const logger                                       = require("../utils/logger");

// ─── Constants ────────────────────────────────────────────────────────────────

const GEMINI_TIMEOUT_MS = 15_000; // 15 seconds

// ─── Timeout wrapper ─────────────────────────────────────────────────────────

/**
 * Races a promise against a timeout.
 * @param {Promise}  promise
 * @param {number}   ms
 * @param {string}   label   - used in the timeout error message
 */
const withTimeout = (promise, ms, label = "operation") => {
  const timeout = new Promise((_, reject) =>
    setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms)
  );
  return Promise.race([promise, timeout]);
};

// ─── Primary path: Gemini ────────────────────────────────────────────────────

/**
 * Calls Gemini and parses the response into a question array.
 *
 * @param {string} role
 * @param {string} difficulty
 * @returns {Promise<Array<{ question: string, orderIndex: number }>>}
 * @throws {Error} on API errors, timeouts, or parse failures
 */
const tryGeminiGeneration = async (role, difficulty) => {
  const model = getGeminiModel();

  if (!model) {
    throw new Error("Gemini model not initialised (API key missing).");
  }

  const prompt   = buildQuestionPrompt(role, difficulty);
  const expected = DIFFICULTY_CONFIG[difficulty]?.count ?? 5;

  logger.info("[AI] Sending request to Gemini", { role, difficulty, expected });

  // Wrap the Gemini call with a hard timeout
  const result = await withTimeout(
    model.generateContent(prompt),
    GEMINI_TIMEOUT_MS,
    "Gemini generateContent"
  );

  const rawText = result.response?.text?.();

  if (!rawText || typeof rawText !== "string") {
    throw new Error("Gemini returned an empty or non-string response.");
  }

  logger.debug("[AI] Raw Gemini response", { length: rawText.length, preview: rawText.slice(0, 200) });

  const { questions, valid, count, error } = parseGeminiQuestions(rawText, expected);

  if (!valid || count === 0) {
    throw new Error(`AI response parsing failed: ${error}`);
  }

  // Attach orderIndex so the DB insert matches the Question model
  return questions.map((q, i) => ({ question: q.question, orderIndex: i + 1 }));
};

// ─── Fallback path: hardcoded bank ───────────────────────────────────────────

/**
 * Falls back to the local question bank.
 * Never throws — if the bank also fails (bad role), returns empty array.
 *
 * @param {string} role
 * @param {string} difficulty
 * @returns {Array<{ question: string, orderIndex: number }>}
 */
const fallbackToQuestionBank = (role, difficulty) => {
  try {
    logger.warn("[AI] Falling back to hardcoded question bank", { role, difficulty });
    return getQuestionsForSession(role, difficulty);
  } catch (err) {
    logger.error("[AI] Fallback question bank also failed", { error: err.message, role, difficulty });
    return [];
  }
};

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Generates interview questions for a given role and difficulty.
 *
 * Always resolves — never rejects. On any AI failure, returns hardcoded
 * questions so interview sessions can always be created.
 *
 * @param {string} role        - e.g. "FRONTEND_DEVELOPER"
 * @param {string} difficulty  - "EASY" | "MEDIUM" | "HARD"
 * @returns {Promise<{ questions: Array<{ question: string, orderIndex: number }>, source: "ai" | "fallback" }>}
 */
const generateInterviewQuestions = async (role, difficulty) => {
  const startTime = Date.now();

  try {
    const questions = await tryGeminiGeneration(role, difficulty);

    const elapsed = Date.now() - startTime;
    logger.info("[AI] Questions generated successfully", {
      role,
      difficulty,
      count:      questions.length,
      elapsed_ms: elapsed,
      source:     "gemini",
    });

    return { questions, source: "ai" };
  } catch (aiError) {
    const elapsed = Date.now() - startTime;
    logger.error("[AI] Gemini generation failed — using fallback", {
      error:      aiError.message,
      role,
      difficulty,
      elapsed_ms: elapsed,
    });

    const questions = fallbackToQuestionBank(role, difficulty);

    return { questions, source: "fallback" };
  }
};

// ─── Phase 5: Personalized path ───────────────────────────────────────────────

/**
 * Calls Gemini with a resume-aware personalized prompt.
 *
 * @param {string} role
 * @param {string} difficulty
 * @param {object} resumeAnalysis  - Output from resumeAnalysisService
 * @returns {Promise<Array<{ question: string, orderIndex: number }>>}
 * @throws {Error} on API errors, timeouts, or parse failures
 */
const tryPersonalizedGeneration = async (role, difficulty, resumeAnalysis) => {
  const model = getGeminiModel();

  if (!model) {
    throw new Error("Gemini model not initialised (API key missing).");
  }

  const prompt   = buildPersonalizedQuestionPrompt(role, difficulty, resumeAnalysis);
  const expected = DIFFICULTY_CONFIG[difficulty]?.count ?? 5;

  logger.info("[AI] Sending personalized question request to Gemini", {
    role,
    difficulty,
    expected,
    skills:   resumeAnalysis.skills?.length   ?? 0,
    projects: resumeAnalysis.projects?.length ?? 0,
  });

  const result = await withTimeout(
    model.generateContent(prompt),
    GEMINI_TIMEOUT_MS,
    "Gemini personalized generateContent"
  );

  const rawText = result.response?.text?.();

  if (!rawText || typeof rawText !== "string") {
    throw new Error("Gemini returned an empty or non-string response.");
  }

  logger.debug("[AI] Raw personalized Gemini response", {
    length:  rawText.length,
    preview: rawText.slice(0, 200),
  });

  const { questions, valid, count, error } = parseGeminiQuestions(rawText, expected);

  if (!valid || count === 0) {
    throw new Error(`Personalized AI response parsing failed: ${error}`);
  }

  return questions.map((q, i) => ({ question: q.question, orderIndex: i + 1 }));
};

/**
 * Generates personalized interview questions using the candidate's resume analysis.
 * Falls back to generic question generation if personalization fails.
 *
 * Always resolves — never rejects.
 *
 * @param {string} role
 * @param {string} difficulty
 * @param {object} resumeAnalysis  - { skills, projects, experienceLevel, domains }
 * @returns {Promise<{ questions: Array, source: "ai" | "fallback", isPersonalized: boolean }>}
 */
const generatePersonalizedQuestions = async (role, difficulty, resumeAnalysis) => {
  const startTime = Date.now();

  // Guard: if analysis is empty, fall back to generic
  const hasUsefulData = (
    (resumeAnalysis?.skills?.length  ?? 0) > 0 ||
    (resumeAnalysis?.projects?.length ?? 0) > 0
  );

  if (!hasUsefulData) {
    logger.warn("[AI] Resume analysis has no useful data — using generic questions", {
      role, difficulty,
    });
    const { questions, source } = await generateInterviewQuestions(role, difficulty);
    return { questions, source, isPersonalized: false };
  }

  try {
    const questions = await tryPersonalizedGeneration(role, difficulty, resumeAnalysis);

    const elapsed = Date.now() - startTime;
    logger.info("[AI] Personalized questions generated successfully", {
      role, difficulty, count: questions.length, elapsed_ms: elapsed,
    });

    return { questions, source: "ai", isPersonalized: true };
  } catch (aiError) {
    const elapsed = Date.now() - startTime;
    logger.error("[AI] Personalized generation failed — falling back to generic", {
      error: aiError.message, role, difficulty, elapsed_ms: elapsed,
    });

    // Fall back to generic (which itself falls back to question bank)
    const { questions, source } = await generateInterviewQuestions(role, difficulty);
    return { questions, source, isPersonalized: false };
  }
};

module.exports = { generateInterviewQuestions, generatePersonalizedQuestions };
