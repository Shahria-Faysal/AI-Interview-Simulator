/**
 * routes/auth.routes.js
 */

const express = require("express");
const router = express.Router();

const { register, login, getMe } = require("../controllers/auth.controller");
const { authenticate } = require("../middleware/auth.middleware");
const {
  registerValidation,
  loginValidation,
  runValidation,
} = require("../middleware/validate.middleware");

// POST /api/auth/register
router.post("/register", registerValidation, runValidation, register);

// POST /api/auth/login
router.post("/login", loginValidation, runValidation, login);

// GET /api/auth/me  (protected)
router.get("/me", authenticate, getMe);

module.exports = router;
