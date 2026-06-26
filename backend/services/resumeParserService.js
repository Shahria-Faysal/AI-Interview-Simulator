/**
 * services/resumeParserService.js
 * Extracts plain text from an uploaded PDF resume.
 *
 * Architecture note:
 *   - Uses `pdf-parse` which is a pure-JS parser (no native binaries needed).
 *   - Sanitizes the raw text so downstream services receive clean input.
 *   - Throws a typed error so callers can distinguish parse failures from
 *     other errors and handle them appropriately.
 */

const fs      = require("fs");
const path    = require("path");
const pdfParse = require("pdf-parse");
const logger  = require("../utils/logger");

// Cap text sent to Gemini — avoids token-limit issues with very long resumes
const MAX_TEXT_LENGTH = 10_000;

/**
 * Custom error type so the controller can identify parse failures.
 */
class ResumeParseError extends Error {
  constructor(message, cause) {
    super(message);
    this.name = "ResumeParseError";
    this.cause = cause;
  }
}

/**
 * Sanitizes raw PDF text:
 *   - Collapses runs of whitespace/newlines
 *   - Removes null bytes and non-printable control characters
 *   - Trims leading/trailing whitespace
 *   - Truncates to MAX_TEXT_LENGTH
 *
 * @param {string} raw
 * @returns {string}
 */
const sanitizeText = (raw) => {
  if (!raw || typeof raw !== "string") return "";

  return raw
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, " ") // strip control chars (keep \t \n \r)
    .replace(/[ \t]+/g, " ")         // collapse horizontal whitespace
    .replace(/\n{3,}/g, "\n\n")      // collapse excess blank lines
    .trim()
    .slice(0, MAX_TEXT_LENGTH);
};

/**
 * Extracts and sanitizes text from a PDF file on disk.
 *
 * @param {string} filePath  Absolute path to the PDF file
 * @returns {Promise<string>} Cleaned resume text
 * @throws {ResumeParseError} If the file cannot be read or parsed
 */
const extractResumeText = async (filePath) => {
  // Validate the file exists before trying to parse
  if (!fs.existsSync(filePath)) {
    throw new ResumeParseError(`PDF file not found: ${filePath}`);
  }

  logger.info("[ResumeParser] Extracting text from PDF", {
    file: path.basename(filePath),
  });

  let dataBuffer;
  try {
    dataBuffer = fs.readFileSync(filePath);
  } catch (err) {
    throw new ResumeParseError(`Failed to read PDF file: ${err.message}`, err);
  }

  let parsed;
  try {
    parsed = await pdfParse(dataBuffer);
  } catch (err) {
    throw new ResumeParseError(`pdf-parse failed: ${err.message}`, err);
  }

  const rawText = parsed?.text ?? "";

  if (!rawText || rawText.trim().length < 10) {
    throw new ResumeParseError(
      "PDF appears to be empty or contains only images (no extractable text)."
    );
  }

  const cleanText = sanitizeText(rawText);

  logger.info("[ResumeParser] Text extracted successfully", {
    file:        path.basename(filePath),
    rawLength:   rawText.length,
    cleanLength: cleanText.length,
    pages:       parsed.numpages ?? "unknown",
  });

  return cleanText;
};

module.exports = { extractResumeText, ResumeParseError };
