/**
 * routes/question.routes.js
 */

const express = require("express");
const router = express.Router();

const {
  submitAnswer,
  getSessionQuestions,
} = require("../controllers/question.controller");
const { authenticate } = require("../middleware/auth.middleware");

router.use(authenticate);

// GET   /api/questions/session/:sessionId  → all questions for a session
router.get("/session/:sessionId", getSessionQuestions);

// PATCH /api/questions/:id/answer          → submit an answer
router.patch("/:id/answer", submitAnswer);

module.exports = router;
