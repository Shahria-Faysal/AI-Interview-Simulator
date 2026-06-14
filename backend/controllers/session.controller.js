
const prisma = require("../prisma/client");
const { generateInterviewQuestions } = require("../services/aiService");
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

    // ── Step 1: Generate questions (AI or fallback) ──────────────────────────
    const { questions: generatedQuestions, source } = await generateInterviewQuestions(
      role,
      difficulty
    );

    if (!generatedQuestions || generatedQuestions.length === 0) {
      return res.status(500).json({
        success: false,
        message:
          "Could not generate interview questions. Please try again in a moment.",
      });
    }

    logger.info("[Session] Creating session", {
      userId:    req.user.id,
      role,
      difficulty,
      questionCount: generatedQuestions.length,
      source,
    });

    // ── Step 2: Persist session + questions atomically ───────────────────────
    const session = await prisma.$transaction(async (tx) => {
      const newSession = await tx.interviewSession.create({
        data: {
          userId:         req.user.id,
          role,
          difficulty,
          // Store which source generated the questions — persisted so the
          // frontend can display it consistently on every page load.
          questionSource: source === 'ai' ? 'AI' : 'FALLBACK',
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

    // Attach metadata the frontend can use for informational display.
    // Normalise questionSource to lowercase ("ai" | "fallback") so the
    // frontend doesn't need to know about the Prisma enum casing.
    const sessionData = {
      ...session,
      questionSource: session.questionSource === 'AI' ? 'ai' : 'fallback',
    }

    res.status(201).json({
      success: true,
      message: 'Interview session created.',
      data: {
        session: sessionData,
        meta: {
          questionSource: source,            // "ai" | "fallback"
          questionCount:  session.questions.length,
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
 * Marks a session as completed.
 * Phase 1 score = % of questions that have a non-empty answer.
 * Phase 3 (AI scoring) will update this logic.
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

    const answered = session.questions.filter(
      (q) => q.answer && q.answer.trim().length > 0
    ).length;
    const total = session.questions.length;
    const score = total > 0 ? Math.round((answered / total) * 100) : 0;

    const updatedSession = await prisma.interviewSession.update({
      where:   { id },
      data:    { completedAt: new Date(), score },
      include: { questions: { orderBy: { orderIndex: 'asc' } } },
    })

    res.json({
      success: true,
      message: 'Session completed.',
      data: {
        session: {
          ...updatedSession,
          questionSource: updatedSession.questionSource === 'AI' ? 'ai' : 'fallback',
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { createSession, getUserSessions, getSession, completeSession };
