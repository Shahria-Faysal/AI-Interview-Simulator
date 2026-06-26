/**
 * controllers/resume.controller.js
 * Manages resume uploads, retrieval, deletion, and Phase 5 analysis.
 *
 * Phase 5 additions:
 *   - processResume()        → async pipeline: extract text → Gemini analysis → DB update
 *   - getResumeInsights()    → GET /api/resumes/:id/insights
 *   - uploadResume()         → kicks off processResume fire-and-forget after DB insert
 */

const path    = require("path");
const fs      = require("fs");
const prisma  = require("../prisma/client");
const logger  = require("../utils/logger");
const { extractResumeText, ResumeParseError } = require("../services/resumeParserService");
const { analyzeResume }                        = require("../services/resumeAnalysisService");

// ─── Resume Processing Pipeline ───────────────────────────────────────────────

/**
 * Runs the full resume analysis pipeline asynchronously.
 * This is called fire-and-forget from uploadResume so it never blocks the
 * upload response.
 *
 * Pipeline:
 *   1. Set analysisStatus → "processing"
 *   2. Extract text with pdf-parse
 *   3. Analyse text with Gemini
 *   4. Persist results (extractedText, analysisData, detectedSkills, …)
 *   5. Set analysisStatus → "done" (or "failed" on any error)
 *
 * @param {string} resumeId
 * @param {string} filePath  Absolute path to the PDF on disk
 */
const processResume = async (resumeId, filePath) => {
  logger.info("[Resume] Starting analysis pipeline", { resumeId });

  // Step 1: Mark as processing so we never duplicate work
  try {
    await prisma.resume.update({
      where: { id: resumeId },
      data:  { analysisStatus: "processing" },
    });
  } catch (err) {
    logger.error("[Resume] Failed to set analysisStatus=processing", {
      resumeId, error: err.message,
    });
    return; // Can't proceed if we can't update the record
  }

  try {
    // Step 2: Extract PDF text
    const extractedText = await extractResumeText(filePath);

    await prisma.resume.update({
      where: { id: resumeId },
      data:  { extractedText, parsedAt: new Date() },
    });

    logger.info("[Resume] Text extracted, sending to Gemini", { resumeId, textLength: extractedText.length });

    // Step 3: Analyse with Gemini
    const analysisData = await analyzeResume(extractedText);

    // Step 4: Persist full analysis
    await prisma.resume.update({
      where: { id: resumeId },
      data: {
        analysisData,
        detectedSkills:   analysisData.skills,
        detectedProjects: analysisData.projects,
        analysisStatus:   "done",
      },
    });

    logger.info("[Resume] Analysis pipeline complete", {
      resumeId,
      skills:          analysisData.skills.length,
      projects:        analysisData.projects.length,
      experienceLevel: analysisData.experienceLevel,
    });
  } catch (err) {
    const isParseError = err instanceof ResumeParseError;
    logger.error("[Resume] Analysis pipeline failed", {
      resumeId,
      type:  isParseError ? "ResumeParseError" : "GeneralError",
      error: err.message,
    });

    // Step 5: Mark as failed so the frontend can show an appropriate message
    try {
      await prisma.resume.update({
        where: { id: resumeId },
        data:  { analysisStatus: "failed" },
      });
    } catch (updateErr) {
      logger.error("[Resume] Failed to set analysisStatus=failed", {
        resumeId, error: updateErr.message,
      });
    }
  }
};

// ─── Route Handlers ───────────────────────────────────────────────────────────

/**
 * POST /api/resumes/upload
 * Saves file metadata to the database after Multer writes the file to disk.
 * Kicks off async resume processing (non-blocking).
 */
const uploadResume = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No file uploaded. Please select a PDF file.",
      });
    }

    const { filename, size, originalname } = req.file;
    const fileUrl  = `/uploads/${filename}`;
    const filePath = path.join(__dirname, "..", "uploads", filename);

    const resume = await prisma.resume.create({
      data: {
        userId:   req.user.id,
        fileUrl,
        fileName: originalname,
        fileSize: size,
        // analysisStatus defaults to "pending" via schema
      },
    });

    // Kick off analysis pipeline without awaiting — response is sent immediately
    // so the user doesn't wait for Gemini to finish.
    setImmediate(() => {
      processResume(resume.id, filePath).catch((err) => {
        logger.error("[Resume] Unhandled error in processResume", { error: err.message });
      });
    });

    res.status(201).json({
      success: true,
      message: "Resume uploaded successfully. AI analysis is in progress.",
      data: { resume },
    });
  } catch (error) {
    // If DB write fails, remove the orphaned file to keep the filesystem clean
    if (req.file) {
      const filePath = path.join(__dirname, "..", "uploads", req.file.filename);
      fs.unlink(filePath, () => {}); // fire-and-forget
    }
    next(error);
  }
};

/**
 * GET /api/resumes
 * Lists all resumes belonging to the authenticated user.
 */
const getUserResumes = async (req, res, next) => {
  try {
    const resumes = await prisma.resume.findMany({
      where:   { userId: req.user.id },
      orderBy: { uploadedAt: "desc" },
    });

    res.json({ success: true, data: { resumes } });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/resumes/:id/insights
 * Returns the AI analysis data for a specific resume.
 * Frontend polls this endpoint while analysisStatus is "processing".
 */
const getResumeInsights = async (req, res, next) => {
  try {
    const { id } = req.params;

    const resume = await prisma.resume.findFirst({
      where: { id, userId: req.user.id },
      select: {
        id:              true,
        fileName:        true,
        analysisStatus:  true,
        detectedSkills:  true,
        detectedProjects: true,
        analysisData:    true,
        parsedAt:        true,
        uploadedAt:      true,
      },
    });

    if (!resume) {
      return res.status(404).json({
        success: false,
        message: "Resume not found.",
      });
    }

    // Shape the response so the frontend gets a clean, flat structure
    const analysis = resume.analysisData ?? null;

    res.json({
      success: true,
      data: {
        id:              resume.id,
        fileName:        resume.fileName,
        analysisStatus:  resume.analysisStatus, // "pending"|"processing"|"done"|"failed"
        uploadedAt:      resume.uploadedAt,
        parsedAt:        resume.parsedAt,
        skills:          analysis?.skills          ?? [],
        projects:        analysis?.projects        ?? [],
        experienceLevel: analysis?.experienceLevel ?? null,
        domains:         analysis?.domains         ?? [],
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/resumes/:id
 * Removes a resume record and its associated file from disk.
 */
const deleteResume = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Ensure the resume belongs to the requesting user
    const resume = await prisma.resume.findFirst({
      where: { id, userId: req.user.id },
    });

    if (!resume) {
      return res.status(404).json({
        success: false,
        message: "Resume not found.",
      });
    }

    // Delete database record first
    await prisma.resume.delete({ where: { id } });

    // Then attempt to remove the physical file
    const filename = path.basename(resume.fileUrl);
    const filePath = path.join(__dirname, "..", "uploads", filename);
    fs.unlink(filePath, (err) => {
      if (err) console.warn(`⚠️  Could not delete file ${filePath}:`, err.message);
    });

    res.json({ success: true, message: "Resume deleted successfully." });
  } catch (error) {
    next(error);
  }
};

module.exports = { uploadResume, getUserResumes, getResumeInsights, deleteResume };
