/**
 * controllers/question.controller.js
 * Handles answer submission for individual questions within a session.
 */

const prisma = require("../prisma/client");

/**
 * PATCH /api/questions/:id/answer
 * Saves the user's answer to a question.
 * Verifies the question belongs to a session owned by the current user.
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

    // Verify ownership: question → session → user
    const question = await prisma.question.findFirst({
      where: {
        id,
        session: { userId: req.user.id },
      },
      include: { session: { select: { completedAt: true } } },
    });

    if (!question) {
      return res.status(404).json({
        success: false,
        message: "Question not found.",
      });
    }

    // Prevent editing answers after a session is completed
    if (question.session.completedAt) {
      return res.status(400).json({
        success: false,
        message: "Cannot modify answers for a completed session.",
      });
    }

    const updated = await prisma.question.update({
      where: { id },
      data: { answer: answer.trim() },
    });

    res.json({
      success: true,
      message: "Answer saved.",
      data: { question: updated },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/questions/session/:sessionId
 * Returns all questions for a session (with answers if already submitted).
 */
const getSessionQuestions = async (req, res, next) => {
  try {
    const { sessionId } = req.params;

    // Verify the session belongs to the current user
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
      where: { sessionId },
      orderBy: { orderIndex: "asc" },
    });

    res.json({ success: true, data: { questions } });
  } catch (error) {
    next(error);
  }
};

module.exports = { submitAnswer, getSessionQuestions };
