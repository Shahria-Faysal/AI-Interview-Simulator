/**
 * controllers/session.controller.js
 * Manages interview session lifecycle:
 *   - create   → generate AI questions (personalized if resume exists), seed into DB
 *   - list     → interview history for the current user
 *   - get      → single session with its questions
 *   - complete → mark session finished, calculate score
 */

const prisma = require("../prisma/client");
const { generateInterviewQuestions, generatePersonalizedQuestions } = require("../services/aiService");
const logger = require("../utils/logger");

/**
 * POST /api/sessions
 * 1. Generate questions via Gemini (falls back to question bank on failure).
 * 2. Persist InterviewSession + Questions in a single Prisma transaction.
 * 3. Return the full session with questions.
 *
 * Questions are generated ONCE at session creation and stored in the DB.
 * Subsequent page loads fetch from DB — Gemini is never called again for
 * the same session.
 */
const createSession = async (req, res, next) => {
  try {
    const { role, difficulty } = req.body;

    // ── Step 1: Check for an analysed resume to personalise questions ─────────
    let resumeAnalysis  = null;
    let isPersonalized  = false;

    const latestResume = await prisma.resume.findFirst({
      where:   { userId: req.user.id, analysisStatus: "done" },
      orderBy: { uploadedAt: "desc" },
      select:  { id: true, analysisData: true },
    });

    if (latestResume?.analysisData) {
      resumeAnalysis = latestResume.analysisData;
      logger.info("[Session] Found analysed resume — will generate personalized questions", {
        userId:   req.user.id,
        resumeId: latestResume.id,
      });
    }

    // ── Step 2: Generate questions (personalised or generic) ──────────────────
    let generatedQuestions, source;

    if (resumeAnalysis) {
      ({ questions: generatedQuestions, source, isPersonalized } =
        await generatePersonalizedQuestions(role, difficulty, resumeAnalysis));
    } else {
      ({ questions: generatedQuestions, source } =
        await generateInterviewQuestions(role, difficulty));
      isPersonalized = false;
    }

    if (!generatedQuestions || generatedQuestions.length === 0) {
      return res.status(500).json({
        success: false,
        message:
          "Could not generate interview questions. Please try again in a moment.",
      });
    }

    logger.info("[Session] Creating session", {
      userId:        req.user.id,
      role,
      difficulty,
      questionCount: generatedQuestions.length,
      source,
      isPersonalized,
    });

    // ── Step 3: Persist session + questions atomically ────────────────────────
    const session = await prisma.$transaction(async (tx) => {
      const newSession = await tx.interviewSession.create({
        data: {
          userId:         req.user.id,
          role,
          difficulty,
          questionSource: source === 'ai' ? 'AI' : 'FALLBACK',
          isPersonalized,
        },
      });

      await tx.question.createMany({
        data: generatedQuestions.map((q) => ({
          sessionId:  newSession.id,
          question:   q.question,
          orderIndex: q.orderIndex,
        })),
      });

      return tx.interviewSession.findUnique({
        where:   { id: newSession.id },
        include: { questions: { orderBy: { orderIndex: "asc" } } },
      });
    });

    const sessionData = {
      ...session,
      questionSource: session.questionSource === 'AI' ? 'ai' : 'fallback',
    };

    res.status(201).json({
      success: true,
      message: isPersonalized
        ? 'Interview session created with personalized questions based on your resume.'
        : 'Interview session created.',
      data: {
        session: sessionData,
        meta: {
          questionSource: source,
          questionCount:  session.questions.length,
          isPersonalized,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/sessions
 * Returns all sessions for the authenticated user (newest first).
 */
const getUserSessions = async (req, res, next) => {
  try {
    const sessions = await prisma.interviewSession.findMany({
      where:   { userId: req.user.id },
      include: {
        questions: {
          select:  { id: true, question: true, answer: true, score: true, orderIndex: true },
          orderBy: { orderIndex: 'asc' },
        },
      },
      orderBy: { startedAt: 'desc' },
    })

    // Normalise questionSource enum to lowercase for the frontend
    const normalised = sessions.map(s => ({
      ...s,
      questionSource: s.questionSource === 'AI' ? 'ai' : 'fallback',
    }))

    res.json({ success: true, data: { sessions: normalised } });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/sessions/:id
 * Returns a single session with all its questions.
 * Only accessible by the session owner.
 */
const getSession = async (req, res, next) => {
  try {
    const { id } = req.params;

    const session = await prisma.interviewSession.findFirst({
      where:   { id, userId: req.user.id },
      include: { questions: { orderBy: { orderIndex: 'asc' } } },
    })

    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Session not found.',
      })
    }

    res.json({
      success: true,
      data: {
        session: {
          ...session,
          questionSource: session.questionSource === 'AI' ? 'ai' : 'fallback',
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/sessions/:id/complete
 * Marks a session as completed and calculates the final score.
 *
 * Phase 4 scoring logic (priority order):
 *  1. If questions have AI scores (1-10), compute the average and scale to 0-100.
 *  2. Fall back to % of questions answered (Phase 1 logic) if no AI scores exist.
 *     This covers the edge case where Gemini was unavailable for all answers.
 */
const completeSession = async (req, res, next) => {
  try {
    const { id } = req.params;

    const session = await prisma.interviewSession.findFirst({
      where:   { id, userId: req.user.id },
      include: { questions: true },
    });

    if (!session) {
      return res.status(404).json({ success: false, message: "Session not found." });
    }

    if (session.completedAt) {
      return res.status(400).json({
        success: false,
        message: "This session has already been completed.",
      });
    }

    const questions = session.questions;
    const total     = questions.length;

    // Prefer AI scores where available
    const aiScoredQuestions = questions.filter(q => q.score !== null && q.score !== undefined);

    let score;
    if (aiScoredQuestions.length > 0) {
      // Average AI score (1–10) → scale to 0–100
      const avgAiScore = aiScoredQuestions.reduce((sum, q) => sum + q.score, 0) / aiScoredQuestions.length;
      score = Math.round((avgAiScore / 10) * 100);
    } else {
      // Fallback: % of questions with any answer
      const answered = questions.filter(q => q.answer && q.answer.trim().length > 0).length;
      score = total > 0 ? Math.round((answered / total) * 100) : 0;
    }

    const updatedSession = await prisma.interviewSession.update({
      where:   { id },
      data:    { completedAt: new Date(), score },
      include: { questions: { orderBy: { orderIndex: "asc" } } },
    });

    res.json({
      success: true,
      message: "Session completed.",
      data: {
        session: {
          ...updatedSession,
          questionSource: updatedSession.questionSource === "AI" ? "ai" : "fallback",
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { createSession, getUserSessions, getSession, completeSession };
