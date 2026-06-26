/**
 * services/resumeAnalysisService.js
 * Uses Gemini to extract structured data from a resume's raw text.
 *
 * Output shape:
 *   {
 *     skills:          string[]   // e.g. ["React", "Node.js", "PostgreSQL"]
 *     projects:        string[]   // e.g. ["E-commerce platform", "Booking system"]
 *     experienceLevel: string     // "Junior" | "Mid-level" | "Senior"
 *     domains:         string[]   // e.g. ["Web Development", "DevOps"]
 *   }
 *
 * Guarantees:
 *   - Never throws to the caller — returns a best-effort result on any failure.
 *   - Falls back to empty arrays if Gemini is unavailable or returns garbage.
 *   - Applies a 20-second timeout to avoid hanging.
 */

const { getAnalysisModel }           = require("../config/gemini");
const { buildResumeAnalysisPrompt } = require("../config/prompts");
const logger                        = require("../utils/logger");

const ANALYSIS_TIMEOUT_MS = 20_000;

// ─── Default fallback result ──────────────────────────────────────────────────

const DEFAULT_ANALYSIS = {
  skills:          [],
  projects:        [],
  experienceLevel: "Unknown",
  domains:         [],
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const withTimeout = (promise, ms, label = "operation") => {
  const timeout = new Promise((_, reject) =>
    setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms)
  );
  return Promise.race([promise, timeout]);
};

/**
 * Strips markdown code fences from Gemini's response.
 * Gemini sometimes wraps JSON in ```json ... ``` even when told not to.
 */
const stripCodeFences = (text) => {
  return text
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```\s*$/i, "")
    .trim();
};

/**
 * Validates and normalises the analysis object returned by Gemini.
 * Any missing or malformed fields are replaced with safe defaults.
 *
 * @param {unknown} raw  Parsed JSON from Gemini
 * @returns {{ skills: string[], projects: string[], experienceLevel: string, domains: string[] }}
 */
const normaliseAnalysis = (raw) => {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return { ...DEFAULT_ANALYSIS };
  }

  const toStringArray = (val) => {
    if (!Array.isArray(val)) return [];
    return val.filter((v) => typeof v === "string" && v.trim().length > 0);
  };

  const validLevels = ["Junior", "Mid-level", "Senior", "Unknown"];
  let experienceLevel = raw.experienceLevel ?? "Unknown";
  if (!validLevels.includes(experienceLevel)) {
    // Try to normalise common variants
    const lower = String(experienceLevel).toLowerCase();
    if (lower.includes("junior") || lower.includes("entry")) experienceLevel = "Junior";
    else if (lower.includes("senior") || lower.includes("lead")) experienceLevel = "Senior";
    else if (lower.includes("mid") || lower.includes("intermediate")) experienceLevel = "Mid-level";
    else experienceLevel = "Unknown";
  }

  return {
    skills:          toStringArray(raw.skills),
    projects:        toStringArray(raw.projects),
    experienceLevel,
    domains:         toStringArray(raw.domains),
  };
};

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Analyses resume text with Gemini and returns structured data.
 * Always resolves — never rejects.
 *
 * @param {string} resumeText  Cleaned text from the PDF
 * @returns {Promise<{ skills: string[], projects: string[], experienceLevel: string, domains: string[] }>}
 */
const analyzeResume = async (resumeText) => {
  const model = getAnalysisModel();

  if (!model) {
    logger.warn("[ResumeAnalysis] Gemini model not initialised — returning default analysis");
    return { ...DEFAULT_ANALYSIS };
  }

  if (!resumeText || resumeText.trim().length < 10) {
    logger.warn("[ResumeAnalysis] Resume text too short to analyse");
    return { ...DEFAULT_ANALYSIS };
  }

  const prompt = buildResumeAnalysisPrompt(resumeText);

  logger.info("[ResumeAnalysis] Sending resume to Gemini for analysis", {
    textLength: resumeText.length,
  });

  try {
    const result = await withTimeout(
      model.generateContent(prompt),
      ANALYSIS_TIMEOUT_MS,
      "Gemini resume analysis"
    );

    const rawText = result.response?.text?.();

    if (!rawText || typeof rawText !== "string") {
      throw new Error("Gemini returned empty response");
    }

    logger.debug("[ResumeAnalysis] Raw Gemini response", {
      length:  rawText.length,
      preview: rawText.slice(0, 200),
    });

    const cleaned  = stripCodeFences(rawText);
    const parsed   = JSON.parse(cleaned);
    const analysis = normaliseAnalysis(parsed);

    logger.info("[ResumeAnalysis] Analysis complete", {
      skills:          analysis.skills.length,
      projects:        analysis.projects.length,
      experienceLevel: analysis.experienceLevel,
      domains:         analysis.domains.length,
    });

    return analysis;
  } catch (err) {
    logger.error("[ResumeAnalysis] Gemini analysis failed — returning default", {
      error: err.message,
    });
    return { ...DEFAULT_ANALYSIS };
  }
};

module.exports = { analyzeResume };
