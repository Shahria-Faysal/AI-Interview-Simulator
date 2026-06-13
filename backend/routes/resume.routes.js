/**
 * routes/resume.routes.js
 */

const express = require("express");
const router = express.Router();

const {
  uploadResume,
  getUserResumes,
  deleteResume,
} = require("../controllers/resume.controller");
const { authenticate } = require("../middleware/auth.middleware");
const { upload } = require("../middleware/upload.middleware");

// All resume routes require authentication
router.use(authenticate);

// GET  /api/resumes          → list user's resumes
router.get("/", getUserResumes);

// POST /api/resumes/upload   → upload a PDF resume
// The upload.single() middleware runs first; on error it passes to errorHandler
router.post("/upload", (req, res, next) => {
  upload.single("resume")(req, res, (err) => {
    if (err) return next(err);
    next();
  });
}, uploadResume);

// DELETE /api/resumes/:id    → remove a resume
router.delete("/:id", deleteResume);

module.exports = router;
