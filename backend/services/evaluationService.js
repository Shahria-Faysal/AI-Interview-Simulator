/**
 * services/evaluationService.js
 * Evaluates a candidate's answer against an interview question using Gemini.
 *
 * Architecture mirrors aiService.js:
 *   evaluateAnswer(params)
 *     └─ tryGeminiEvaluation()    ← primary path (Gemini)
 *          ├─ success → return evaluation
 *          └─ failure → return FALLBACK_EVALUATION
 *
 * Key guarantees:
 *  1. Never throws — always resolves with an evaluation object.
 *  2. If Gemini is unavailable or returns garbage, returns a null-score
 *     fallback so the answer is still saved and the interview continues.
 *  3. 20-second timeout — evaluation is more token-intensive than generation.
 *  4. temperature 0.2 (set on the model) for consistent, reproducible scores.
 *  5. All outcomes are logged for observability.
 */

const { getEvaluationModel }      = require("../config/gemini");
const { buildEvaluationPrompt }   = require("../config/prompts");
const { parseEvaluationResponse, FALLBACK_EVALUATION } = require("../utils/aiResponseParser");
const logger                       = require("../utils/logger");

// ─── Constants ────────────────────────────────────────────────────────────────

const EVAL_TIMEOUT_MS = 20_000; // 20 seconds — evaluation is more token-heavy

// ─── Timeout wrapper ─────────────────────────────────────────────────────────

const withTimeout = (promise, ms, label = "operation") => {
  const timeout = new Promise((_, reject) =>
    setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms)
  );
  return Promise.race([promise, timeout]);
};

// ─── Primary path: Gemini evaluation ─────────────────────────────────────────

/**
 * Sends the question + answer to Gemini and parses the evaluation.
 *
 * @param {{ question, answer, role, difficulty }} params
 * @returns {Promise<EvaluationResult>}
 * @throws {Error} on API failure, timeout, or parse failure
 */
const tryGeminiEvaluation = async ({ question, answer, role, difficulty }) => {
  const model = getEvaluationModel();

  if (!model) {
    throw new Error("Gemini evaluation model not initialised (API key missing).");
  }

  const prompt = buildEvaluationPrompt({ question, answer, role, difficulty });

  logger.info("[Eval] Sending evaluation request to Gemini", { role, difficulty, answerLength: answer.length });

  const result = await withTimeout(
    model.generateContent(prompt),
    EVAL_TIMEOUT_MS,
    "Gemini evaluation"
  );

  const rawText = result.response?.text?.();

  if (!rawText || typeof rawText !== "string") {
    throw new Error("Gemini evaluation returned an empty or non-string response.");
  }

  logger.debug("[Eval] Raw Gemini evaluation response", {
    length:  rawText.length,
    preview: rawText.slice(0, 300),
  });

  const { evaluation, valid } = parseEvaluationResponse(rawText);

  if (!valid) {
    throw new Error("Evaluation response failed validation.");
  }

  return evaluation;
};

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Evaluates a candidate's answer for an interview question.
 *
 * Always resolves — never rejects. On any Gemini failure, returns a
 * fallback evaluation with null fields so the interview can continue.
 *
 * @param {object} params
 * @param {string} params.question   - The interview question text
 * @param {string} params.answer     - The candidate's submitted answer
 * @param {string} params.role       - Prisma Role enum value
 * @param {string} params.difficulty - Prisma Difficulty enum value
 *
 * @returns {Promise<{
 *   evaluation: {
 *     score:       number | null,
 *     strengths:   string[],
 *     weaknesses:  string[],
 *     suggestions: string[],
 *     idealAnswer: string | null,
 *   },
 *   source: "ai" | "fallback"
 * }>}
 */
const evaluateAnswer = async ({ question, answer, role, difficulty }) => {
  const startTime = Date.now();

  // Guard: don't bother calling Gemini for empty answers
  if (!answer || answer.trim().length === 0) {
    logger.warn("[Eval] Skipping evaluation — answer is empty", { role, difficulty });
    return { evaluation: FALLBACK_EVALUATION, source: "fallback" };
  }

  try {
    const evaluation = await tryGeminiEvaluation({ question, answer, role, difficulty });

    const elapsed = Date.now() - startTime;
    logger.info("[Eval] Evaluation completed successfully", {
      role,
      difficulty,
      score:      evaluation.score,
      elapsed_ms: elapsed,
    });

    return { evaluation, source: "ai" };
  } catch (evalError) {
    const elapsed = Date.now() - startTime;
    logger.error("[Eval] Gemini evaluation failed — returning fallback", {
      error:      evalError.message,
      role,
      difficulty,
      elapsed_ms: elapsed,
    });

    return { evaluation: FALLBACK_EVALUATION, source: "fallback" };
  }
};

module.exports = { evaluateAnswer };
