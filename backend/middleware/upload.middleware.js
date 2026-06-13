/**
 * middleware/upload.middleware.js
 * Configures Multer for PDF resume uploads.
 * - Validates file type (PDF only)
 * - Enforces 5MB size limit
 * - Saves files to the /uploads directory with a unique filename
 */

const multer = require("multer");
const path = require("path");
const crypto = require("crypto");

const UPLOAD_DIR = path.join(__dirname, "..", process.env.UPLOAD_DIR || "uploads");
const MAX_FILE_SIZE = parseInt(process.env.MAX_FILE_SIZE) || 5 * 1024 * 1024; // 5MB

// Persist files to disk with unique names to avoid collisions
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOAD_DIR);
  },
  filename: (req, file, cb) => {
    // Prefix with a random hex string to ensure uniqueness
    const uniqueSuffix = crypto.randomBytes(16).toString("hex");
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `resume_${uniqueSuffix}${ext}`);
  },
});

// Reject any file that isn't a PDF
const fileFilter = (req, file, cb) => {
  const allowedMimeTypes = ["application/pdf"];
  const allowedExtensions = [".pdf"];
  const ext = path.extname(file.originalname).toLowerCase();

  if (
    allowedMimeTypes.includes(file.mimetype) &&
    allowedExtensions.includes(ext)
  ) {
    cb(null, true);
  } else {
    const error = new Error("Only PDF files are allowed.");
    error.code = "INVALID_FILE_TYPE";
    cb(error, false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: MAX_FILE_SIZE },
});

module.exports = { upload };
