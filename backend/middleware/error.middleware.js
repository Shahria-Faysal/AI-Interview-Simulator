/**
 * middleware/error.middleware.js
 * Centralised error handling middleware.
 * Catches errors thrown anywhere in the application and returns a
 * consistent JSON error response.
 */

const errorHandler = (err, req, res, next) => {
  console.error("❌ Error:", err);

  // Prisma unique constraint violations (e.g. duplicate email)
  if (err.code === "P2002") {
    const field = err.meta?.target?.[0] || "field";
    return res.status(409).json({
      success: false,
      message: `A record with that ${field} already exists.`,
    });
  }

  // Prisma record not found
  if (err.code === "P2025") {
    return res.status(404).json({
      success: false,
      message: "Record not found.",
    });
  }

  // Multer file size error
  if (err.code === "LIMIT_FILE_SIZE") {
    return res.status(400).json({
      success: false,
      message: "File too large. Maximum size is 5MB.",
    });
  }

  // Multer invalid file type (thrown manually)
  if (err.code === "INVALID_FILE_TYPE") {
    return res.status(400).json({
      success: false,
      message: err.message,
    });
  }

  // Default to 500 for unexpected errors
  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    success: false,
    message: err.message || "An unexpected server error occurred.",
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  });
};

module.exports = { errorHandler };
