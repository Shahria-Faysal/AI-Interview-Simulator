/**
 * server.js - Main application entry point
 * Configures Express, middleware, routes, and starts the HTTP server.
 */

require("dotenv").config();
const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const path = require("path");

const authRoutes = require("./routes/auth.routes");
const resumeRoutes = require("./routes/resume.routes");
const sessionRoutes = require("./routes/session.routes");
const questionRoutes = require("./routes/question.routes");
const { errorHandler } = require("./middleware/error.middleware");
const { isAiConfigured } = require("./config/gemini");

const app = express();
const PORT = process.env.PORT || 5000;

// ─── Middleware ───────────────────────────────────────────────────────────────

// CORS: allow requests from the Vite dev server (and configured frontend URL)
app.use(
  cors({
    origin: [process.env.FRONTEND_URL || "http://localhost:5173"],
    credentials: true,
  })
);

// Parse incoming JSON bodies
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// HTTP request logging (only in development)
if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
}

// Serve uploaded files as static assets under /uploads
app.use(
  "/uploads",
  express.static(path.join(__dirname, process.env.UPLOAD_DIR || "uploads"))
);

// ─── API Routes ───────────────────────────────────────────────────────────────

app.use("/api/auth", authRoutes);
app.use("/api/resumes", resumeRoutes);
app.use("/api/sessions", sessionRoutes);
app.use("/api/questions", questionRoutes);

// Health-check endpoint — includes AI readiness for operator monitoring
app.get("/api/health", (req, res) => {
  const aiReady = isAiConfigured();
  res.json({
    status:    "ok",
    timestamp: new Date().toISOString(),
    ai: {
      configured:    aiReady,
      model:         aiReady ? "gemini-2.5-flash" : null,
      fallbackReady: true,   // question bank is always available
    },
  });
});

// ─── 404 Handler ─────────────────────────────────────────────────────────────

app.use((req, res) => {
  res.status(404).json({ success: false, message: "Route not found" });
});

// ─── Global Error Handler ─────────────────────────────────────────────────────

app.use(errorHandler);

// ─── Start Server ─────────────────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(
    `\n🚀 Server running in ${process.env.NODE_ENV || "development"} mode on port ${PORT}`
  );
  console.log(`   API: http://localhost:${PORT}/api`);
  console.log(`   Health: http://localhost:${PORT}/api/health\n`);
});

module.exports = app;
