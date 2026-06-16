/**
 * controllers/question.controller.js
 * Handles answer submission and AI evaluation for interview questions.
 *
 * Phase 4 flow for PATCH /:id/answer:
 *   1. Validate input and ownership
 *   2. Save the answer to the DB
 *   3. Trigger Gemini evaluation (async, with fallback)
 *   4. Save evaluation fields (score, strengths, weaknesses, suggestions, idealAnswer)
 *   5. Return the fully-evaluated question to the frontend
 */

const prisma = require("../prisma/client");
const { evaluateAnswer } = require("../services/evaluationService");
const logger = require("../utils/logger");

/**
 * PATCH /api/questions/:id/answer
 * Saves the answer and runs AI evaluation.
 * Returns the question with evaluation fields populated.
 */
const submitAnswer = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { answer } = req.body;

    if (typeof answer !== "string" || answer.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: "Answer cannot be empty.",
      });
    }

    // ── Verify ownership: question → session → user ──────────────────────────
    const question = await prisma.question.findFirst({
      where: {
        id,
        session: { userId: req.user.id },
      },
      include: {
        session: {
          select: { completedAt: true, role: true, difficulty: true },
        },
      },
    });

    if (!question) {
      return res.status(404).json({
        success: false,
        message: "Question not found.",
      });
    }

    if (question.session.completedAt) {
      return res.status(400).json({
        success: false,
        message: "Cannot modify answers for a completed session.",
      });
    }

    const trimmedAnswer = answer.trim();
    const { role, difficulty } = question.session;

    // ── Step 1: Persist the answer immediately ────────────────────────────────
    // Save the answer first so it is never lost even if evaluation fails.
    await prisma.question.update({
      where: { id },
      data:  { answer: trimmedAnswer },
    });

    logger.info("[Question] Answer saved, starting AI evaluation", {
      questionId: id,
      role,
      difficulty,
      answerLength: trimmedAnswer.length,
    });

    // ── Step 2: Evaluate with Gemini ──────────────────────────────────────────
    // evaluateAnswer() never throws — on failure it returns FALLBACK_EVALUATION
    // with null fields. The question is always saved regardless.
    const { evaluation, source } = await evaluateAnswer({
      question:   question.question,
      answer:     trimmedAnswer,
      role,
      difficulty,
    });

    // ── Step 3: Persist evaluation fields ────────────────────────────────────
    const evaluated = await prisma.question.update({
      where: { id },
      data: {
        score:       evaluation.score,
        strengths:   evaluation.strengths,
        weaknesses:  evaluation.weaknesses,
        suggestions: evaluation.suggestions,
        idealAnswer: evaluation.idealAnswer,
      },
    });

    logger.info("[Question] Evaluation saved", {
      questionId: id,
      score:      evaluation.score,
      source,
    });

    res.json({
      success: true,
      message: "Answer saved and evaluated.",
      data: {
        question:   evaluated,
        evaluation: {
          score:       evaluated.score,
          strengths:   evaluated.strengths,
          weaknesses:  evaluated.weaknesses,
          suggestions: evaluated.suggestions,
          idealAnswer: evaluated.idealAnswer,
          source,           // "ai" | "fallback" — frontend can show a caveat if fallback
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/questions/session/:sessionId
 * Returns all questions for a session, including any evaluation data.
 */
const getSessionQuestions = async (req, res, next) => {
  try {
    const { sessionId } = req.params;

    const session = await prisma.interviewSession.findFirst({
      where: { id: sessionId, userId: req.user.id },
    });

    if (!session) {
      return res.status(404).json({
        success: false,
        message: "Session not found.",
      });
    }

    const questions = await prisma.question.findMany({
      where:   { sessionId },
      orderBy: { orderIndex: "asc" },
    });

    res.json({ success: true, data: { questions } });
  } catch (error) {
    next(error);
  }
};

module.exports = { submitAnswer, getSessionQuestions };
