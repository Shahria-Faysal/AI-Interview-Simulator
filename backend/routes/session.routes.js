/**
 * routes/session.routes.js
 */

const express = require("express");
const router = express.Router();

const {
  createSession,
  getUserSessions,
  getSession,
  completeSession,
} = require("../controllers/session.controller");
const { authenticate } = require("../middleware/auth.middleware");
const {
  sessionValidation,
  runValidation,
} = require("../middleware/validate.middleware");

router.use(authenticate);

// GET  /api/sessions        → list all sessions for current user
router.get("/", getUserSessions);

// POST /api/sessions        → create a new session
router.post("/", sessionValidation, runValidation, createSession);

// GET  /api/sessions/:id    → get a single session
router.get("/:id", getSession);

// PATCH /api/sessions/:id/complete  → mark session as done
router.patch("/:id/complete", completeSession);

module.exports = router;
