/**
 * controllers/session.controller.js
 * Manages interview session lifecycle:
 *   - create  → seed questions from the question bank
 *   - list    → interview history for the current user
 *   - get     → single session with its questions
 *   - complete → mark a session as finished and calculate a score
 */

const prisma = require("../prisma/client");
const { getQuestionsForSession } = require("../services/questionBank.service");

/**
 * POST /api/sessions
 * Creates a new interview session and seeds it with questions.
 */
const createSession = async (req, res, next) => {
  try {
    const { role, difficulty } = req.body;

    // Fetch questions from the hardcoded bank
    const questionTemplates = getQuestionsForSession(role, difficulty);

    // Create session + questions in a single transaction
    const session = await prisma.$transaction(async (tx) => {
      const newSession = await tx.interviewSession.create({
        data: {
          userId: req.user.id,
          role,
          difficulty,
        },
      });

      await tx.question.createMany({
        data: questionTemplates.map((q) => ({
          sessionId: newSession.id,
          question: q.question,
          orderIndex: q.orderIndex,
        })),
      });

      // Return session with its questions
      return tx.interviewSession.findUnique({
        where: { id: newSession.id },
        include: {
          questions: { orderBy: { orderIndex: "asc" } },
        },
      });
    });

    res.status(201).json({
      success: true,
      message: "Interview session created.",
      data: { session },
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
      where: { userId: req.user.id },
      include: {
        questions: {
          select: { id: true, question: true, answer: true, score: true, orderIndex: true },
          orderBy: { orderIndex: "asc" },
        },
      },
      orderBy: { startedAt: "desc" },
    });

    res.json({ success: true, data: { sessions } });
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
      where: { id, userId: req.user.id },
      include: {
        questions: { orderBy: { orderIndex: "asc" } },
      },
    });

    if (!session) {
      return res.status(404).json({
        success: false,
        message: "Session not found.",
      });
    }

    res.json({ success: true, data: { session } });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/sessions/:id/complete
 * Marks a session as completed.
 * Computes a basic score based on how many questions received answers.
 * Phase 2 will replace this with AI-evaluated scoring.
 */
const completeSession = async (req, res, next) => {
  try {
    const { id } = req.params;

    const session = await prisma.interviewSession.findFirst({
      where: { id, userId: req.user.id },
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

    // Phase 1 scoring: % of questions that have a non-empty answer
    const answered = session.questions.filter(
      (q) => q.answer && q.answer.trim().length > 0
    ).length;
    const total = session.questions.length;
    const score = total > 0 ? Math.round((answered / total) * 100) : 0;

    const updatedSession = await prisma.interviewSession.update({
      where: { id },
      data: {
        completedAt: new Date(),
        score,
      },
      include: {
        questions: { orderBy: { orderIndex: "asc" } },
      },
    });

    res.json({
      success: true,
      message: "Session completed.",
      data: { session: updatedSession },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { createSession, getUserSessions, getSession, completeSession };
